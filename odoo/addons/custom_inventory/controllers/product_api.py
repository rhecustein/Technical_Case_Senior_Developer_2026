import json
import logging
import functools
import os
from odoo import http
from odoo.http import request, Response
from ..services.product_service import ProductService

_logger = logging.getLogger(__name__)

# API key for machine-to-machine calls (e.g. NestJS backend).
# Set via ODOO_API_KEY environment variable; falls back to session auth if absent.
_API_KEY = os.environ.get('ODOO_API_KEY', '')


def json_response(data, status=200):
    """Helper to return a JSON response with correct Content-Type."""
    return Response(
        json.dumps(data, default=str),
        status=status,
        content_type='application/json',
    )


def require_auth(func):
    """
    Decorator that enforces authentication via one of two mechanisms:

    1. **X-API-Key header** — for machine-to-machine calls (NestJS backend).
       Validated against the ODOO_API_KEY environment variable.
    2. **Odoo session** — for browser-based or manual access.
       Uses Odoo's built-in session; no re-authentication per request.

    Returns 401 if neither mechanism provides a valid identity.
    """
    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        api_key = request.httprequest.headers.get('X-API-Key', '')
        if _API_KEY and api_key == _API_KEY:
            # Valid API key — proceed as authenticated
            return func(self, *args, **kwargs)

        if request.session.uid:
            # Valid Odoo session — proceed
            return func(self, *args, **kwargs)

        return json_response(
            {'success': False, 'data': None, 'message': 'Authentication required. '
             'Provide a valid X-API-Key header or an active Odoo session.'},
            status=401,
        )
    return wrapper


class ProductApiController(http.Controller):
    """
    REST API controller for product management.
    Delegates all business logic to ProductService.

    Authentication:
      - X-API-Key header (ODOO_API_KEY env var) for NestJS backend calls
      - Odoo session for browser / manual access
    """

    _ROUTE_BASE = '/api/v1/products'

    # ------------------------------------------------------------------ #
    #  LIST
    # ------------------------------------------------------------------ #

    @http.route(
        _ROUTE_BASE,
        type='http',
        auth='none',
        methods=['GET'],
        csrf=False,
        cors='*',
    )
    @require_auth
    def list_products(self, **kwargs):
        """GET /api/v1/products?page=1&pageSize=20&search="""
        try:
            page = max(1, int(kwargs.get('page', 1)))
            page_size = min(100, max(1, int(kwargs.get('pageSize', 10))))
            search = kwargs.get('search', '').strip()

            service = ProductService(request.env)
            result = service.get_products(page, page_size, search)

            return json_response({
                'success': True,
                'data': result['data'],
                'message': 'Products retrieved successfully',
                'pagination': result['pagination'],
            })
        except Exception as exc:
            _logger.exception('Error listing products')
            return json_response(
                {'success': False, 'data': None, 'message': str(exc)},
                status=500,
            )

    # ------------------------------------------------------------------ #
    #  GET SINGLE
    # ------------------------------------------------------------------ #

    @http.route(
        f'{_ROUTE_BASE}/<int:product_id>',
        type='http',
        auth='none',
        methods=['GET'],
        csrf=False,
        cors='*',
    )
    @require_auth
    def get_product(self, product_id: int, **kwargs):
        """GET /api/v1/products/<id>"""
        try:
            service = ProductService(request.env)
            product_data = service.get_product_by_id(product_id)
            if product_data is None:
                return json_response(
                    {'success': False, 'data': None, 'message': 'Product not found'},
                    status=404,
                )
            return json_response({
                'success': True,
                'data': product_data,
                'message': 'Product retrieved successfully',
            })
        except Exception as exc:
            _logger.exception('Error getting product %d', product_id)
            return json_response(
                {'success': False, 'data': None, 'message': str(exc)},
                status=500,
            )

    # ------------------------------------------------------------------ #
    #  CREATE
    # ------------------------------------------------------------------ #

    @http.route(
        _ROUTE_BASE,
        type='http',
        auth='none',
        methods=['POST'],
        csrf=False,
        cors='*',
    )
    @require_auth
    def create_product(self, **kwargs):
        """POST /api/v1/products"""
        try:
            body = self._parse_json_body()
            if body is None:
                return json_response(
                    {'success': False, 'data': None, 'message': 'Invalid JSON body'},
                    status=400,
                )

            for field in ('part_number', 'product_name'):
                if not body.get(field):
                    return json_response(
                        {'success': False, 'data': None, 'message': f'Field {field} is required'},
                        status=400,
                    )

            service = ProductService(request.env)
            product_data = service.create_product(body)

            return json_response({
                'success': True,
                'data': product_data,
                'message': 'Product created successfully',
            }, status=201)
        except Exception as exc:
            _logger.exception('Error creating product')
            return json_response(
                {'success': False, 'data': None, 'message': str(exc)},
                status=500,
            )

    # ------------------------------------------------------------------ #
    #  UPDATE
    # ------------------------------------------------------------------ #

    @http.route(
        f'{_ROUTE_BASE}/<int:product_id>',
        type='http',
        auth='none',
        methods=['PUT'],
        csrf=False,
        cors='*',
    )
    @require_auth
    def update_product(self, product_id: int, **kwargs):
        """PUT /api/v1/products/<id>"""
        try:
            body = self._parse_json_body()
            if body is None:
                return json_response(
                    {'success': False, 'data': None, 'message': 'Invalid JSON body'},
                    status=400,
                )

            service = ProductService(request.env)
            product_data = service.update_product(product_id, body)
            if product_data is None:
                return json_response(
                    {'success': False, 'data': None, 'message': 'Product not found'},
                    status=404,
                )

            return json_response({
                'success': True,
                'data': product_data,
                'message': 'Product updated successfully',
            })
        except Exception as exc:
            _logger.exception('Error updating product %d', product_id)
            return json_response(
                {'success': False, 'data': None, 'message': str(exc)},
                status=500,
            )

    # ------------------------------------------------------------------ #
    #  DELETE
    # ------------------------------------------------------------------ #

    @http.route(
        f'{_ROUTE_BASE}/<int:product_id>',
        type='http',
        auth='none',
        methods=['DELETE'],
        csrf=False,
        cors='*',
    )
    @require_auth
    def delete_product(self, product_id: int, **kwargs):
        """DELETE /api/v1/products/<id>"""
        try:
            service = ProductService(request.env)
            deleted = service.delete_product(product_id)
            if not deleted:
                return json_response(
                    {'success': False, 'data': None, 'message': 'Product not found'},
                    status=404,
                )
            return json_response({
                'success': True,
                'data': None,
                'message': 'Product deleted successfully',
            })
        except Exception as exc:
            _logger.exception('Error deleting product %d', product_id)
            return json_response(
                {'success': False, 'data': None, 'message': str(exc)},
                status=500,
            )

    # ------------------------------------------------------------------ #
    #  BULK UPDATE
    # ------------------------------------------------------------------ #

    @http.route(
        f'{_ROUTE_BASE}/bulk-update',
        type='http',
        auth='none',
        methods=['POST'],
        csrf=False,
        cors='*',
    )
    @require_auth
    def bulk_update_products(self, **kwargs):
        """POST /api/v1/products/bulk-update — Body: { "updates": [...] }"""
        try:
            body = self._parse_json_body()
            if body is None or 'updates' not in body:
                return json_response(
                    {'success': False, 'data': None, 'message': 'Body must contain "updates" array'},
                    status=400,
                )

            updates = body['updates']
            if not isinstance(updates, list):
                return json_response(
                    {'success': False, 'data': None, 'message': '"updates" must be an array'},
                    status=400,
                )

            service = ProductService(request.env)
            result = service.bulk_update(updates)

            return json_response({
                'success': len(result['errors']) == 0 and len(result['not_found']) == 0,
                'data': result,
                'message': f"Bulk update completed: {result['summary']['success']} updated, "
                           f"{result['summary']['failed']} failed",
            })
        except Exception as exc:
            _logger.exception('Error in bulk update')
            return json_response(
                {'success': False, 'data': None, 'message': str(exc)},
                status=500,
            )

    # ------------------------------------------------------------------ #
    #  HELPERS
    # ------------------------------------------------------------------ #

    @staticmethod
    def _parse_json_body() -> dict | None:
        """Parse JSON from request body. Returns None on failure."""
        try:
            raw = request.httprequest.data
            if not raw:
                return {}
            return json.loads(raw.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None
