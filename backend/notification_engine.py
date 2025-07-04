import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List
from .models import NotificationRule, NotificationCondition

class NotificationEngine:
    def __init__(self, redis_client, email_service):
        self.redis = redis_client
        self.email_service = email_service
    
    def evaluate_conditions(self, session_id: str, webhook_data: Dict[Any, Any]):
        """Evaluate all notification rules for a session"""
        rules = self._get_session_rules(session_id)
        
        for rule in rules:
            if not rule.is_active:
                continue
                
            # Check cooldown
            if self._is_in_cooldown(rule):
                continue
                
            # Evaluate condition
            if self._evaluate_condition(rule, webhook_data):
                self._trigger_notification(rule, webhook_data)
    
    def _evaluate_condition(self, rule: NotificationRule, 
                          webhook_data: Dict[Any, Any]) -> bool:
        """Evaluate a single notification condition"""
        condition = rule.condition
        operator = rule.operator
        value = rule.value
        
        if condition == NotificationCondition.STATUS_CODE:
            actual_value = webhook_data.get('status_code')
            return self._compare_values(actual_value, operator, value)
            
        elif condition == NotificationCondition.METHOD:
            actual_value = webhook_data.get('method')
            return self._compare_values(actual_value, operator, value)
            
        elif condition == NotificationCondition.IP_ADDRESS:
            actual_value = webhook_data.get('ip')
            return self._compare_values(actual_value, operator, value)
            
        elif condition == NotificationCondition.HEADER_CONTAINS:
            headers = webhook_data.get('headers', {})
            if operator == "contains":
                return any(value.lower() in str(v).lower() for v in headers.values())
            elif operator == "key_exists":
                return value in headers
                
        elif condition == NotificationCondition.BODY_CONTAINS:
            body = webhook_data.get('body', '')
            if operator == "contains":
                return value.lower() in body.lower()
            elif operator == "regex":
                return bool(re.search(value, body))
                
        elif condition == NotificationCondition.QUERY_PARAM:
            query_params = webhook_data.get('query_params', {})
            if operator == "exists":
                return value in query_params
            elif operator == "equals":
                return query_params.get(value) == rule.value
                
        elif condition == NotificationCondition.RESPONSE_TIME:
            response_time = webhook_data.get('response_time_ms', 0)
            return self._compare_values(response_time, operator, value)
            
        elif condition == NotificationCondition.RATE_LIMIT:
            # Check if requests exceed rate limit
            current_time = datetime.now()
            time_window = timedelta(minutes=int(value))
            count = self._count_recent_requests(rule.session_id, current_time, time_window)
            return count > int(rule.value)
            
        return False
    
    def _compare_values(self, actual, operator: str, expected):
        """Compare values based on operator"""
        if operator == "equals":
            return actual == expected
        elif operator == "not_equals":
            return actual != expected
        elif operator == "greater_than":
            return float(actual) > float(expected)
        elif operator == "less_than":
            return float(actual) < float(expected)
        elif operator == "contains":
            return str(expected).lower() in str(actual).lower()
        elif operator == "in_list":
            return actual in expected
        return False
    
    def _trigger_notification(self, rule: NotificationRule, webhook_data: Dict[Any, Any]):
        """Trigger notification email"""
        subject = f"Webhook Alert: {rule.name}"
        condition_info = {
            'condition_name': rule.name,
            'triggered_value': self._get_triggered_value(rule, webhook_data)
        }
        
        success = self.email_service.send_notification(
            rule.email_recipients,
            subject,
            webhook_data,
            condition_info
        )
        
        if success:
            # Update last triggered time
            rule.last_triggered = datetime.now().isoformat()
            self._save_rule(rule)
            
            # Log notification
            self._log_notification(rule.session_id, rule.id, webhook_data)
    
    def _is_in_cooldown(self, rule: NotificationRule) -> bool:
        """Check if rule is in cooldown period"""
        if not rule.last_triggered:
            return False
            
        last_triggered = datetime.fromisoformat(rule.last_triggered)
        cooldown_period = timedelta(minutes=rule.cooldown_minutes)
        return datetime.now() - last_triggered < cooldown_period
    
    def _get_session_rules(self, session_id: str) -> List[NotificationRule]:
        """Get all notification rules for a session"""
        rules_data = self.redis.get(f"notification_rules:{session_id}")
        if not rules_data:
            return []
            
        rules = json.loads(rules_data)
        return [NotificationRule(**rule) for rule in rules]
    
    def _save_rule(self, rule: NotificationRule):
        """Save updated rule to Redis"""
        rules = self._get_session_rules(rule.session_id)
        # Update the rule in the list
        for i, r in enumerate(rules):
            if r.id == rule.id:
                rules[i] = rule
                break
        
        # Save back to Redis
        self.redis.set(f"notification_rules:{rule.session_id}", 
                      json.dumps([r.dict() for r in rules]))