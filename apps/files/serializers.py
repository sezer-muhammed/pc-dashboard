from rest_framework import serializers


class FileEntrySerializer(serializers.Serializer):
    name = serializers.CharField()
    path = serializers.CharField()
    is_dir = serializers.BooleanField()
    size = serializers.IntegerField(allow_null=True)
    modified = serializers.DateTimeField()


class DirListingSerializer(serializers.Serializer):
    path = serializers.CharField()
    parent = serializers.CharField(allow_null=True)
    entries = FileEntrySerializer(many=True)
