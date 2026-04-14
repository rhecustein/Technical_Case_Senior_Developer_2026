export interface OdooProductRaw {
  id: number;
  name: string;
  x_part_number: string;
  x_brand: string | false;
  list_price: number;
  standard_price: number;
  uom_id: [number, string];
  description: string | false;
}

export interface OdooProductMapped {
  odooProductId: number;
  partNumber: string;
  productName: string;
  brand: string;
  salesPrice: number;
  costPrice: number;
  uom: string;
  description: string;
}

export interface OdooPullResult {
  data: OdooProductMapped[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
