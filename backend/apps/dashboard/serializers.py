from rest_framework import serializers


class DashboardStatsSerializer(serializers.Serializer):
    total_reports = serializers.IntegerField()
    pending_reports = serializers.IntegerField()
    verified_reports = serializers.IntegerField()
    resolved_reports = serializers.IntegerField()
    total_locations = serializers.IntegerField()
    total_users = serializers.IntegerField()
    reports_by_impact = serializers.DictField(child=serializers.IntegerField())
