export interface IPropertyRepository {
  findNameById(propertyId: string): Promise<string | null>;
}
