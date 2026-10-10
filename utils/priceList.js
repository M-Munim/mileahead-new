// Magic Track official price list (QAR), taken from the client's price list
// poster. Single source for the order form, the orders table and customer data.
//
// Wash / polish / protection services are priced for Sedan, SUV and 7-Seater.
// PPF uses its own vehicle sizes (Sedan, Crossover, SUV, GMC / Large SUV), so the
// vehicle choices depend on the service picked.

export const SERVICE_GROUPS = [
  {
    key: 'wash',
    title: 'Car Wash, Polishing & Protection',
    vehicles: ['Sedan', 'SUV', '7-Seater'],
    services: [
      { name: 'Body Wash – In & Out',                prices: { Sedan: 30,   SUV: 35,   '7-Seater': 40 } },
      { name: 'Body Polishing',                      prices: { Sedan: 300,  SUV: 350,  '7-Seater': 400 } },
      { name: 'Glass Polish',                        prices: { Sedan: 150,  SUV: 180,  '7-Seater': 200 } },
      { name: 'Full Interior Cleaning',              prices: { Sedan: 280,  SUV: 350,  '7-Seater': 400 } },
      { name: 'Interior & Exterior Polishing',       prices: { Sedan: 600,  SUV: 650,  '7-Seater': 750 } },
      { name: 'Nano Ceramic Tint',                   prices: { Sedan: 1000, SUV: 1200, '7-Seater': 1500 } },
      { name: 'Nano Ceramic Coating – Graphene Pro', prices: { Sedan: 1000, SUV: 1200, '7-Seater': 1500 } },
    ],
  },
  {
    key: 'ppf',
    title: 'Paint Protection Film (PPF)',
    vehicles: ['Sedan', 'Crossover', 'SUV', 'GMC / Large SUV'],
    services: [
      { name: 'Paint Protection Film (PPF)', prices: { Sedan: 6000, Crossover: 7000, SUV: 8000, 'GMC / Large SUV': 9000 } },
    ],
  },
];

/** Upholstery & interior extras. `from: true` = starting price, final price may be higher. */
export const EXTRAS = [
  { name: 'Floor Mat',                  price: 450, from: true },
  { name: 'Dashboard Cover',            price: 70 },
  { name: 'Steering Wheel Cover',       price: 70 },
  { name: 'Handrest Cover',             price: 70 },
  { name: 'Side Door Cover',            price: 200 },
  { name: 'Roof / Ceiling Modification', price: 500 },
  { name: 'Seat Cover',                 price: 550, from: true },
];

/** Every vehicle type on the price list. */
export const ALL_VEHICLES = ['Sedan', 'Crossover', 'SUV', '7-Seater', 'GMC / Large SUV'];

export const DISCOUNTS = ['Coupon', 'Loyalty Free', 'Fleet Discount'];
export const PAYMENT_METHODS = ['Fawran', 'Paylater', 'Partner Credit'];

export function findService(name) {
  for (const group of SERVICE_GROUPS) {
    const service = group.services.find((s) => s.name === name);
    if (service) return { group, service };
  }
  return null;
}

/** Vehicle choices for a service. With no service (extras only) any vehicle can be picked. */
export const vehiclesForService = (name) => findService(name)?.group.vehicles ?? ALL_VEHICLES;

/** Service price for a vehicle, or undefined when that combination isn't on the list. */
export const servicePrice = (name, vehicle) => findService(name)?.service.prices[vehicle];

export const findExtra = (name) => EXTRAS.find((e) => e.name === name);

/** Service + extras, straight from the price list. */
export function priceFor(service, vehicle, extras = []) {
  const base = servicePrice(service, vehicle) ?? 0;
  return extras.reduce((sum, name) => sum + (findExtra(name)?.price ?? 0), base);
}

export const formatQar = (amount) => `QAR ${Number(amount || 0).toLocaleString('en-US')}`;
