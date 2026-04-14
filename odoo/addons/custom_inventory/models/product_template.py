from odoo import models, fields, api
from odoo.exceptions import ValidationError
import logging

_logger = logging.getLogger(__name__)


class ProductTemplate(models.Model):
    """
    Extension of product.template to add warehouse-specific fields
    and business logic for inventory management.
    """
    _inherit = 'product.template'

    x_part_number = fields.Char(
        string='Part Number',
        required=True,
        index=True,
        copy=False,
        help='Unique part number identifier for warehouse tracking',
    )

    x_brand = fields.Char(
        string='Brand',
        index=True,
        help='Product brand or manufacturer',
    )

    _sql_constraints = [
        (
            'unique_part_number',
            'UNIQUE(x_part_number)',
            'Part number must be unique across all products.',
        ),
    ]

    @api.constrains('x_part_number')
    def _check_part_number(self):
        """Validate that part number is not empty and has valid format."""
        for record in self:
            if not record.x_part_number or not record.x_part_number.strip():
                raise ValidationError('Part number cannot be empty.')
            if len(record.x_part_number.strip()) > 255:
                raise ValidationError('Part number cannot exceed 255 characters.')

    def get_warehouse_data(self) -> dict:
        """
        Serialize this product record to a JSON-safe dict.
        Spec-required method name — delegates to _serialize_product.
        """
        self.ensure_one()
        return self._serialize_product(self)

    @api.model
    def get_product_data(self, product_id):
        """
        Retrieve serialized product data by ID.
        Returns dict with all relevant fields.
        """
        product = self.browse(product_id)
        if not product.exists():
            return None
        return self._serialize_product(product)

    @api.model
    def search_products_paginated(self, page: int, page_size: int, search: str = ''):
        """
        Search and paginate products.
        Returns tuple of (records, total_count).
        """
        domain = [('active', 'in', [True, False])]
        if search:
            domain += [
                '|',
                ('x_part_number', 'ilike', search),
                ('name', 'ilike', search),
            ]

        total = self.search_count(domain)
        offset = (page - 1) * page_size
        products = self.search(domain, offset=offset, limit=page_size, order='id asc')
        return products, total

    def _serialize_product(self, product):
        """
        Serialize a product record to a JSON-safe dictionary.
        Encapsulates the field mapping logic.
        """
        uom_name = product.uom_id.name if product.uom_id else ''
        uom_normalized = self._normalize_uom(uom_name)

        return {
            'id': product.id,
            'part_number': product.x_part_number or '',
            'product_name': product.name or '',
            'brand': product.x_brand or '',
            'sales_price': product.list_price,
            'cost_price': product.standard_price,
            'uom': uom_normalized,
            'uom_id': product.uom_id.id if product.uom_id else None,
            'description': product.description or '',
            'active': product.active,
        }

    @staticmethod
    def _normalize_uom(uom_name: str) -> str:
        """Normalize UOM name to standard values: PCS, BOX, DOZEN."""
        mapping = {
            'pcs': 'PCS',
            'piece': 'PCS',
            'pieces': 'PCS',
            'unit': 'PCS',
            'units': 'PCS',
            'box': 'BOX',
            'boxes': 'BOX',
            'dozen': 'DOZEN',
            'dozens': 'DOZEN',
            'dz': 'DOZEN',
        }
        return mapping.get(uom_name.lower().strip(), uom_name.upper() if uom_name else 'PCS')

    @api.model
    def create_from_api(self, vals: dict):
        """
        Create a product from API data.
        Handles UOM lookup and field mapping.
        """
        odoo_vals = self._map_api_to_odoo_fields(vals)
        return self.create(odoo_vals)

    def update_from_api(self, vals: dict):
        """Update this product record from API data."""
        odoo_vals = self._map_api_to_odoo_fields(vals)
        return self.write(odoo_vals)

    @api.model
    def _map_api_to_odoo_fields(self, vals: dict) -> dict:
        """
        Map external API field names to Odoo field names.
        Handles UOM resolution by name.
        """
        odoo_vals = {}

        field_mapping = {
            'part_number': 'x_part_number',
            'product_name': 'name',
            'brand': 'x_brand',
            'sales_price': 'list_price',
            'cost_price': 'standard_price',
            'description': 'description',
        }

        for api_field, odoo_field in field_mapping.items():
            if api_field in vals:
                odoo_vals[odoo_field] = vals[api_field]

        if 'uom' in vals:
            uom = self._resolve_uom(vals['uom'])
            if uom:
                odoo_vals['uom_id'] = uom.id
                odoo_vals['uom_po_id'] = uom.id

        return odoo_vals

    @api.model
    def _resolve_uom(self, uom_name: str):
        """Resolve UOM name to uom.uom record."""
        UomModel = self.env['uom.uom']
        uom_search_names = {
            'PCS': ['Units', 'Unit', 'pcs', 'Pieces', 'Piece'],
            'BOX': ['Box', 'Boxes'],
            'DOZEN': ['Dozen', 'Dozens', 'dz'],
        }
        search_list = uom_search_names.get(uom_name.upper(), [uom_name])
        for name in search_list:
            uom = UomModel.search([('name', '=ilike', name)], limit=1)
            if uom:
                return uom
        _logger.warning('UOM not found: %s', uom_name)
        return UomModel.search([], limit=1)
