import logging
from typing import Optional

_logger = logging.getLogger(__name__)


class ProductService:
    """
    Service layer for product business logic.
    Delegates to model methods — keeps the controller thin.
    """

    def __init__(self, env):
        self._env = env
        self._Product = env['product.template'].sudo()

    # ------------------------------------------------------------------ #
    #  READ
    # ------------------------------------------------------------------ #

    def get_products(self, page: int = 1, page_size: int = 20, search: str = '') -> dict:
        """
        Return paginated product list.
        page_size is capped at 100 to prevent runaway queries.
        """
        page = max(1, page)
        page_size = min(100, max(1, page_size))

        products, total = self._Product.search_products_paginated(page, page_size, search)
        total_pages = max(1, -(-total // page_size))  # ceiling division

        return {
            'data': [self._Product._serialize_product(p) for p in products],
            'pagination': {
                'page': page,
                'pageSize': page_size,
                'total': total,
                'totalPages': total_pages,
            },
        }

    def get_product_by_id(self, product_id: int) -> Optional[dict]:
        """Retrieve a single product by Odoo ID. Returns None if not found."""
        return self._Product.get_product_data(product_id)

    def get_product_by_part_number(self, part_number: str) -> Optional[dict]:
        """Retrieve a single product by part number. Returns None if not found."""
        product = self._Product.search(
            [('x_part_number', '=', part_number)], limit=1
        )
        if not product:
            return None
        return self._Product._serialize_product(product)

    # ------------------------------------------------------------------ #
    #  WRITE
    # ------------------------------------------------------------------ #

    def create_product(self, vals: dict) -> dict:
        """Create a new product from API payload. Raises on validation error."""
        product = self._Product.create_from_api(vals)
        return self._Product._serialize_product(product)

    def update_product(self, product_id: int, vals: dict) -> Optional[dict]:
        """
        Update an existing product by ID.
        Returns updated dict, or None if not found.
        """
        product = self._Product.browse(product_id)
        if not product.exists():
            return None
        product.update_from_api(vals)
        return self._Product._serialize_product(product)

    def delete_product(self, product_id: int) -> bool:
        """Delete a product by ID. Returns True if deleted, False if not found."""
        product = self._Product.browse(product_id)
        if not product.exists():
            return False
        product.unlink()
        return True

    def bulk_update(self, products: list) -> dict:
        """
        Bulk upsert products by part_number.
        Items not found by part_number are recorded in 'not_found'.
        Returns summary with updated part numbers, errors, and not_found list.
        """
        updated = []
        not_found = []
        errors = []

        for item in products:
            part_number = item.get('part_number')
            if not part_number:
                errors.append({'item': item, 'error': 'part_number is required'})
                continue

            try:
                product = self._Product.search(
                    [('x_part_number', '=', part_number)], limit=1
                )
                if not product:
                    not_found.append(part_number)
                    continue
                product.update_from_api(item)
                updated.append(self._Product._serialize_product(product))
            except Exception as exc:
                _logger.exception('Bulk update error for part_number=%s', part_number)
                errors.append({'part_number': part_number, 'error': str(exc)})

        return {
            'updated': updated,
            'not_found': not_found,
            'errors': errors,
            'summary': {
                'total': len(products),
                'success': len(updated),
                'failed': len(errors) + len(not_found),
            },
        }

    # ------------------------------------------------------------------ #
    #  PRIVATE
    # ------------------------------------------------------------------ #

    def _map_fields(self, data: dict) -> dict:
        """Map inhouse API field names to Odoo model field names."""
        return self._Product._map_api_to_odoo_fields(data)
