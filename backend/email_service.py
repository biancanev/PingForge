import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
from typing import List, Dict, Any

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
    
    def send_notification(self, to_emails: List[str], subject: str, 
                         webhook_data: Dict[Any, Any], condition_info: Dict[str, Any]):
        """Send notification email when condition is met"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            
            # Create HTML email content
            html_body = self._create_email_template(webhook_data, condition_info)
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
                
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False
    
    def _create_email_template(self, webhook_data: Dict[Any, Any], 
                              condition_info: Dict[str, Any]) -> str:
        """Create HTML email template"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        return f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                .header {{ background-color: #f8f9fa; padding: 20px; border-radius: 8px; }}
                .content {{ margin: 20px 0; }}
                .code {{ background-color: #f1f3f4; padding: 10px; border-radius: 4px; font-family: monospace; }}
                .highlight {{ color: #dc2626; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🚨 Webhook Alert Triggered</h2>
                <p><strong>Time:</strong> {timestamp}</p>
                <p><strong>Condition:</strong> {condition_info['condition_name']}</p>
                <p><strong>Triggered by:</strong> <span class="highlight">{condition_info['triggered_value']}</span></p>
            </div>
            
            <div class="content">
                <h3>Request Details</h3>
                <p><strong>Method:</strong> {webhook_data.get('method', 'N/A')}</p>
                <p><strong>IP Address:</strong> {webhook_data.get('ip', 'N/A')}</p>
                <p><strong>Status Code:</strong> {webhook_data.get('status_code', 'N/A')}</p>
                
                <h3>Request Body</h3>
                <div class="code">{webhook_data.get('body', 'No body')}</div>
                
                <h3>Headers</h3>
                <div class="code">{webhook_data.get('headers', {})}</div>
            </div>
            
            <p><small>This is an automated message from your webhook monitoring system.</small></p>
        </body>
        </html>
        """

# Initialize email service
email_service = EmailService()