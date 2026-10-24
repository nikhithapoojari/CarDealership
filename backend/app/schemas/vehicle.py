from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, model_validator
from pydantic_core import PydanticCustomError


class VehicleCreate(BaseModel):
    make: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=50)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    quantity: int = Field(default=0, ge=0)


class VehicleUpdate(BaseModel):
    """Partial update: send only the fields to change. Unknown fields (e.g. id) are ignored."""

    model_config = ConfigDict(str_strip_whitespace=True)

    make: str | None = Field(default=None, min_length=1, max_length=100)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    quantity: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _at_least_one_non_null_field(self):
        if not self.model_fields_set:
            raise PydanticCustomError("empty_update", "At least one field must be provided")
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise PydanticCustomError("null_field", "Fields may not be null")
        return self


class VehicleResponse(VehicleCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int

    @field_serializer("price")
    def _price_as_number(self, value: Decimal) -> float:
        return float(value)


class RestockRequest(BaseModel):
    quantity: int = Field(gt=0, le=100_000)
