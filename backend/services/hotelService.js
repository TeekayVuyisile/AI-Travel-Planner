class HotelService {
  getHotelsByCity(city, budget, travelers) {
    // Mock hotel data - in a real app, this would come from an API
    const allHotels = [
      {
        id: 1,
        name: `${city} Grand Hotel`,
        price: 120,
        rating: 4.5,
        location: 'City Center',
        amenities: ['WiFi', 'Pool', 'Breakfast', 'Spa'],
        image: '',
        description: 'Luxury accommodation in the heart of the city'
      },
      {
        id: 2,
        name: 'Budget Inn Express',
        price: 65,
        rating: 3.8,
        location: 'Downtown',
        amenities: ['WiFi', 'Parking'],
        image: '',
        description: 'Comfortable and affordable stay'
      },
      {
        id: 3,
        name: 'Riverside Boutique Hotel',
        price: 95,
        rating: 4.2,
        location: 'Riverside',
        amenities: ['WiFi', 'Restaurant', 'Bar'],
        image: '',
        description: 'Charming hotel with river views'
      },
      {
        id: 4,
        name: 'Mountain View Resort',
        price: 150,
        rating: 4.7,
        location: 'Outskirts',
        amenities: ['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant'],
        image: '',
        description: 'Luxury resort with panoramic mountain views'
      },
      {
        id: 5,
        name: 'City Business Hotel',
        price: 110,
        rating: 4.0,
        location: 'Business District',
        amenities: ['WiFi', 'Gym', 'Business Center'],
        image: '',
        description: 'Perfect for business travelers'
      }
    ];

    // Filter hotels based on budget (price per night for all travelers)
    const maxPricePerNight = budget / (travelers * 3); // Simple heuristic
    const filteredHotels = allHotels.filter(hotel => hotel.price <= maxPricePerNight);

    return filteredHotels.length > 0 ? filteredHotels : allHotels.slice(0, 3);
  }

  calculateHotelCost(hotels, nights, travelers) {
    if (hotels.length === 0) return 0;
    
    // Return the average hotel price for the stay
    const averagePrice = hotels.reduce((sum, hotel) => sum + hotel.price, 0) / hotels.length;
    return averagePrice * nights * travelers;
  }
}

export default new HotelService();