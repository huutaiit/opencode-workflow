# DRF Serializers Specialist
# DRFシリアライザースペシャリスト
# Chuyen Gia Serializers DRF

**Stack**: Python 3.12+ / Django 5.x / DRF 3.15+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (API boundary) |
| **Directory Pattern** | `apps/{domain}/serializers.py` |
| **Variant** | ALL |
| **Naming Convention** | `serializers.py`, `PascalCase` + `Serializer` suffix |
| **Imports From** | Domain (models) |
| **Cannot Import** | Views |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | model-serializer, separate-serializers, nested, writable-nested, method-field, validation, to-representation, relationship-fields |
| **Pattern Numbers** | 5.1–5.8 |
| **Source Paths** | `**/serializers.py` |
| **File Count** | 1 per app with API |
| **Imported By** | ViewSets, Views |
| **Specialist Type** | code |
| **Purpose** | ModelSerializer, separate create/read/update, nested serializers, writable nested, SerializerMethodField, validation, to_representation |
| **Activation Trigger** | serializer, ModelSerializer, SerializerMethodField, validate, DRF |

---

## Purpose

Define DRF serializer patterns: ModelSerializer with explicit fields, separate serializers for create/read/update operations, nested serializers, writable nested with overridden create/update, computed fields, field-level and object-level validation, custom representation.

---

## Pattern 5.1: ModelSerializer Basics

```python
from rest_framework import serializers
from apps.articles.models import Article


class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["id", "title", "slug", "body", "status", "author", "created_at"]
        read_only_fields = ["id", "slug", "created_at", "author"]
        extra_kwargs = {
            "body": {"required": True, "allow_blank": False},
        }
```

**Key rule**: Always list fields explicitly. NEVER use `fields = "__all__"`.

---

## Pattern 5.2: Separate Create/Read/Update Serializers

```python
class ArticleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["title", "body", "category"]


class ArticleReadSerializer(serializers.ModelSerializer):
    author = UserReadSerializer(read_only=True)
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Article
        fields = ["id", "title", "slug", "body", "status", "author", "category", "created_at"]


class ArticleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["title", "body", "category", "status"]
```

---

## Pattern 5.3: Nested Serializers (Read-Only)

```python
class OrderReadSerializer(serializers.ModelSerializer):
    customer = UserReadSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "customer", "items", "total", "status", "created_at"]
```

---

## Pattern 5.4: Writable Nested Serializers

```python
class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemCreateSerializer(many=True)

    class Meta:
        model = Order
        fields = ["customer", "items"]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        order = Order.objects.create(**validated_data)
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                OrderItem.objects.create(order=instance, **item_data)
        return instance
```

---

## Pattern 5.5: SerializerMethodField

```python
class ArticleSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = ["id", "title", "author_name", "is_owner", "comment_count"]

    def get_author_name(self, obj) -> str:
        return obj.author.get_full_name()

    def get_is_owner(self, obj) -> bool:
        request = self.context.get("request")
        return request and request.user == obj.author

    def get_comment_count(self, obj) -> int:
        return obj.comments.count()
```

---

## Pattern 5.6: Validation

```python
class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "password", "password_confirm", "full_name"]

    def validate_email(self, value):
        """Field-level validation."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value.lower()

    def validate(self, attrs):
        """Object-level validation (cross-field)."""
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password": "Passwords don't match."})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
```

---

## Pattern 5.7: to_representation

```python
class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["id", "title", "body", "author", "status"]

    def to_representation(self, instance):
        """Custom output — hide fields based on user role."""
        data = super().to_representation(instance)
        request = self.context.get("request")

        # Hide body for non-authenticated users
        if not request or not request.user.is_authenticated:
            data.pop("body", None)

        return data
```

---

## Pattern 5.8: Relationship Fields

```python
class OrderSerializer(serializers.ModelSerializer):
    # PrimaryKeyRelatedField (default) — returns ID
    customer = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    # SlugRelatedField — returns slug
    category = serializers.SlugRelatedField(slug_field="slug", queryset=Category.objects.all())

    # StringRelatedField — returns __str__()
    status_display = serializers.StringRelatedField(source="get_status_display")

    class Meta:
        model = Order
        fields = ["id", "customer", "category", "status_display"]
```

---

## MUST DO

- Always list `fields` explicitly (never `"__all__"`)
- Separate create/read/update serializers for different field sets
- Use `validate_<field>` for field-level, `validate` for cross-field
- Use `write_only=True` for passwords, `read_only=True` for computed
- Override `create`/`update` for writable nested serializers

## MUST NOT DO

- Use `fields = "__all__"` (exposes all fields including sensitive)
- Put business logic in serializers (delegate to models/services)
- Skip `read_only_fields` for auto-generated fields
- Return passwords or secrets in serializer output
- Use depth > 1 (use explicit nested serializers)

---

## References

- [DRF: Serializers](https://www.django-rest-framework.org/api-guide/serializers/)
- [DRF: Serializer Fields](https://www.django-rest-framework.org/api-guide/fields/)
- [DRF: Serializer Relations](https://www.django-rest-framework.org/api-guide/relations/)
