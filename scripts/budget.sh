#!/usr/bin/env bash
# Monthly cost alarm (AWS Budgets) with mail to the developer at 80 % and 100 %. Budgets is a global API and has
# no CloudFormation resource in eu-north-1, so this runs once by hand: pnpm budget
# The beyou account hosts other projects too, so the budget only counts resources tagged Project=bedi. The tag
# must be activated once as a cost allocation tag (Billing → Cost allocation tags → "Project").
set -euo pipefail
LIMIT="${BUDGET_USD:-10}"
EMAIL="${BUDGET_EMAIL:-berat.mov@gmail.com}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"

notify() {
  printf '{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":%s,"ThresholdType":"PERCENTAGE"},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"%s"}]}' "$1" "$EMAIL"
}

aws budgets create-budget --region us-east-1 --account-id "$ACCOUNT" \
  --budget "{\"BudgetName\":\"bedi-monthly\",\"BudgetType\":\"COST\",\"TimeUnit\":\"MONTHLY\",\"BudgetLimit\":{\"Amount\":\"$LIMIT\",\"Unit\":\"USD\"},\"CostFilters\":{\"TagKeyValue\":[\"user:Project\$bedi\"]}}" \
  --notifications-with-subscribers "[$(notify 80),$(notify 100)]"
echo "✓ Budget bedi-monthly: $LIMIT USD, Alarm an $EMAIL"
