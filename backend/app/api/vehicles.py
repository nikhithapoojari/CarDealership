from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.vehicle import RestockRequest, VehicleCreate, VehicleResponse, VehicleUpdate
from app.services.vehicle_service import (
    InvalidPriceRangeError,
    OutOfStockError,
    VehicleNotFoundError,
    VehicleService,
)

router = APIRouter(
    prefix="/api/vehicles", tags=["vehicles"], dependencies=[Depends(get_current_user)]
)


def get_vehicle_service(db: Session = Depends(get_db)) -> VehicleService:
    return VehicleService(VehicleRepository(db))


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle not found")


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(body: VehicleCreate, service: VehicleService = Depends(get_vehicle_service)):
    return service.create(**body.model_dump())


@router.get("", response_model=list[VehicleResponse])
def list_vehicles(service: VehicleService = Depends(get_vehicle_service)):
    return service.list_all()


# Declared before the "/{vehicle_id}" routes so "search" is never parsed as an id.
@router.get("/search", response_model=list[VehicleResponse])
def search_vehicles(
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    service: VehicleService = Depends(get_vehicle_service),
):
    try:
        return service.search(
            make=make, model=model, category=category, min_price=min_price, max_price=max_price
        )
    except InvalidPriceRangeError:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "min_price must not exceed max_price"
        )


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_id: int,
    body: VehicleUpdate,
    service: VehicleService = Depends(get_vehicle_service),
):
    try:
        return service.update(vehicle_id, **body.model_dump(exclude_unset=True))
    except VehicleNotFoundError:
        raise _not_found()


@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_vehicle(vehicle_id: int, service: VehicleService = Depends(get_vehicle_service)):
    try:
        service.delete(vehicle_id)
    except VehicleNotFoundError:
        raise _not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{vehicle_id}/purchase", response_model=VehicleResponse)
def purchase_vehicle(vehicle_id: int, service: VehicleService = Depends(get_vehicle_service)):
    try:
        return service.purchase(vehicle_id)
    except VehicleNotFoundError:
        raise _not_found()
    except OutOfStockError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Vehicle is out of stock")


@router.post(
    "/{vehicle_id}/restock",
    response_model=VehicleResponse,
    dependencies=[Depends(require_admin)],
)
def restock_vehicle(
    vehicle_id: int,
    body: RestockRequest,
    service: VehicleService = Depends(get_vehicle_service),
):
    try:
        return service.restock(vehicle_id, body.quantity)
    except VehicleNotFoundError:
        raise _not_found()
