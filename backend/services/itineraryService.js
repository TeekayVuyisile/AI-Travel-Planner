import hotelService from "./hotelService.js";
import placesService from "./placesService.js";

class ItineraryService {
  generateItinerary(tripData, weatherData, places, hotels) {
    const {
      destination_city,
      start_date,
      end_date,
      travelers_count,
      interests,
      total_budget,
    } = tripData;

    const start = new Date(start_date);
    const end = new Date(end_date);
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const itinerary = [];
    const dailyBudget = total_budget / days;

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);

      const dayPlan = this.generateDayPlan(
        i + 1,
        currentDate,
        destination_city,
        interests,
        dailyBudget,
        travelers_count,
        places,
        weatherData.forecasts?.[i]
      );

      itinerary.push(dayPlan);
    }

    return {
      destination: destination_city,
      duration: `${days} days`,
      travelers: travelers_count,
      total_budget: total_budget,
      daily_itinerary: itinerary,
      summary: this.generateSummary(itinerary, total_budget),
    };
  }

  generateDayPlan(dayNumber, date, city, interests, dailyBudget, travelers, places, weather) {
  const timeSlots = {
    morning: this.getMorningActivity(interests, places, travelers),
    afternoon: this.getAfternoonActivity(interests, places, travelers),
    evening: this.getEveningActivity(interests, places, travelers)
  };

  const estimatedCost = this.calculateDayCost(timeSlots, travelers);
  const dailyBudgetPerPerson = dailyBudget / travelers;
  
  return {
    day: dayNumber,
    date: date.toLocaleDateString(),
    weather: weather ? { ...weather, is_available: true } : { description: 'Sunny', max_temp: 25, min_temp: 15, is_available: false },
    activities: timeSlots,
    estimated_cost: estimatedCost,
    travelers_count: travelers,
    budget_status: estimatedCost.per_person <= dailyBudgetPerPerson ? 'within_budget' : 'over_budget'
  };
}

  getMorningActivity(interests, places, travelersCount) {
    const morningActivities = {
      history: "Visit historical sites and museums",
      nature: "Morning hike or nature walk",
      food: "Local breakfast food tour",
      shopping: "Visit morning markets",
      adventure: "Adventure activity session",
    };

    const primaryInterest = interests[0] || "nature";
    const cost = this.calculateActivityCost(
      primaryInterest,
      "morning",
      travelersCount
    );

    return {
      time: "09:00 - 12:00",
      activity:
        morningActivities[primaryInterest] || "Explore local attractions",
      location: this.getRelevantPlace(places, primaryInterest),
      cost: cost,
    };
  }
  // Similarly update getAfternoonActivity and getEveningActivity methods
  getAfternoonActivity(interests, places, travelersCount) {
    const afternoonActivities = {
      history: "Guided historical tour",
      nature: "Botanical gardens or park visit",
      food: "Lunch at recommended local restaurant",
      shopping: "Shopping district exploration",
      adventure: "Outdoor adventure activities",
    };

    const secondaryInterest = interests[1] || interests[0] || "food";
    const cost = this.calculateActivityCost(
      secondaryInterest,
      "afternoon",
      travelersCount
    );

    return {
      time: "13:00 - 17:00",
      activity:
        afternoonActivities[secondaryInterest] || "Lunch and local exploration",
      location: this.getRelevantPlace(places, secondaryInterest),
      cost: cost,
    };
  }

  getEveningActivity(interests, places, travelersCount) {
    const eveningActivities = {
      history: "Cultural show or evening museum",
      nature: "Sunset viewpoint visit",
      food: "Dinner at highly-rated restaurant",
      shopping: "Night market exploration",
      adventure: "Evening entertainment",
    };

    const cost = this.calculateActivityCost("food", "evening", travelersCount);

    return {
      time: "18:00 - 21:00",
      activity: eveningActivities.food,
      location: this.getRelevantPlace(places, "food"),
      cost: cost,
    };
  }

  getRelevantPlace(places, category) {
    const relevant = places.filter(
      (place) =>
        place.category.includes(category) ||
        place.description.toLowerCase().includes(category)
    );
    return relevant.length > 0 ? relevant[0].name : "Local attractions";
  }

  calculateActivityCost(interest, timeOfDay, travelersCount) {
    const baseCosts = {
      morning: {
        history: 50,
        nature: 20,
        food: 80,
        shopping: 100,
        adventure: 150,
      },
      afternoon: {
        history: 80,
        nature: 30,
        food: 120,
        shopping: 150,
        adventure: 200,
      },
      evening: {
        history: 60,
        nature: 25,
        food: 150,
        shopping: 100,
        adventure: 120,
      },
    };

    const baseCost = baseCosts[timeOfDay]?.[interest] || 100;

    return {
      per_person: baseCost,
      total: baseCost * travelersCount,
    };
  }

  calculateDayCost(activities, travelers) {
    let totalPerPerson = 0;
    let totalForGroup = 0;

    Object.values(activities).forEach((activity) => {
      totalPerPerson += activity.cost.per_person;
      totalForGroup += activity.cost.total;
    });

    return {
      per_person: totalPerPerson,
      total: totalForGroup,
    };
  }
  generateSummary(itinerary, totalBudget) {
    const totalCost = itinerary.reduce(
      (sum, day) => sum + day.estimated_cost.total,
      0
    );
    const daysOverBudget = itinerary.filter(
      (day) => day.budget_status === "over_budget"
    ).length;

    return {
      total_estimated_cost: totalCost,
      budget_difference: totalBudget - totalCost,
      days_within_budget: itinerary.length - daysOverBudget,
      days_over_budget: daysOverBudget,
      recommendation:
        totalCost <= totalBudget
          ? "Your itinerary is within budget!"
          : "Consider adjusting some activities to stay within budget",
    };
  }

  generatePackingList(weatherData, interests, days) {
    const essentials = [
      "Passport",
      "Wallet",
      "Phone charger",
      "Medications",
      "Travel documents",
    ];

    const clothing = [];
    const avgTemp = weatherData.forecasts 
      ? weatherData.forecasts.reduce((sum, f) => sum + f.max_temp, 0) / weatherData.forecasts.length 
      : (weatherData.temperature || 20);

    if (avgTemp > 25) {
      clothing.push("Light clothing", "Sunglasses", "Sunhat", "Sunscreen");
    } else if (avgTemp > 15) {
      clothing.push("Light jacket", "Comfortable shoes", "Layers");
    } else {
      clothing.push("Warm jacket", "Sweaters", "Warm shoes");
    }

    if (interests.includes("adventure")) {
      clothing.push("Hiking shoes", "Backpack", "Water bottle");
    }

    if (interests.includes("nature")) {
      clothing.push("Binoculars", "Camera", "Comfortable walking shoes");
    }

    return {
      essentials,
      clothing,
      accessories: ["Camera", "Power bank", "Adapter", "Water bottle"],
      toiletries: ["Toothbrush", "Shampoo", "Soap", "First aid kit"],
    };
  }
}

export default new ItineraryService();
