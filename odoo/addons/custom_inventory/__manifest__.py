{
    'name': 'Custom Inventory API',
    'version': '17.0.1.0.0',
    'summary': 'Extends product.template with custom fields and exposes REST API',
    'description': '''
        Custom Inventory API module for Warehouse System integration.
        - Adds x_part_number and x_brand fields to product.template
        - Exposes REST API endpoints for CRUD and bulk update
        - Session-cached authentication
    ''',
    'author': 'Warehouse System',
    'category': 'Inventory',
    'depends': ['base', 'product', 'stock'],
    'data': [
        'security/ir.model.access.csv',
        'views/product_template_views.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
