import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register fonts (using default fonts that work in PDF)


// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  coverPage: {
    flexDirection: 'column',
    backgroundColor: '#2d5b88',
    color: 'white',
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  header: {
    fontSize: 32,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 700,
    color: '#2d5b88'
  },
  coverTitle: {
    fontSize: 36,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 700,
    color: 'white'
  },
  coverSubtitle: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: 300,
    color: 'white',
    opacity: 0.9
  },
  coverDetails: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 400,
    color: 'white',
    opacity: 0.8
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 15,
    fontWeight: 700,
    color: '#2d5b88',
    borderBottom: '2px solid #2d5b88',
    paddingBottom: 5
  },
  subsectionTitle: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 700,
    color: '#e76f51'
  },
  text: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 1.5,
    fontWeight: 400,
  },
  textBold: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: 700,
  },
  textSmall: {
    fontSize: 10,
    marginBottom: 5,
    color: '#666666'
  },
  itineraryDay: {
    marginBottom: 25,
    padding: 15,
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa'
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottom: '1px solid #2d5b88'
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#2d5b88'
  },
  weatherBadge: {
    backgroundColor: '#2a9d8f',
    color: 'white',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 10
  },
  activityContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 6,
    border: '1px solid #e9ecef'
  },
  activityTime: {
    width: '25%',
    fontSize: 11,
    fontWeight: 700,
    color: '#2d5b88'
  },
  activityDetails: {
    width: '50%',
    fontSize: 11,
    fontWeight: 400
  },
  activityCost: {
    width: '25%',
    fontSize: 10,
    fontWeight: 400,
    textAlign: 'right'
  },
  activityLocation: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2
  },
  costBreakdown: {
    marginTop: 4,
  },
  costLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2
  },
  costLabel: {
    fontSize: 8,
    color: '#666666'
  },
  costValue: {
    fontSize: 9,
    fontWeight: 600
  },
  costPerPerson: {
    color: '#2d5b88'
  },
  costTotal: {
    color: '#e76f51'
  },
  dailySummary: {
    marginTop: 15,
    paddingTop: 10,
    borderTop: '1px solid #dee2e6'
  },
  budgetStatus: {
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: 4
  },
  budgetWithin: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  budgetOver: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15
  },
  gridItem: {
    width: '50%',
    marginBottom: 10
  },
  list: {
    marginLeft: 15
  },
  listItem: {
    fontSize: 11,
    marginBottom: 6,
    flexDirection: 'row'
  },
  bullet: {
    width: 10,
    fontSize: 14,
    marginRight: 5
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#666666',
    borderTop: '1px solid #e0e0e0',
    paddingTop: 10
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    fontSize: 10,
    color: '#666666'
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    border: '1px solid #e9ecef'
  },
  highlightBox: {
    backgroundColor: '#2d5b88',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  highlightText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center'
  },
  dailyBudgetInfo: {
    fontSize: 10,
    color: '#666666',
    marginTop: 5,
    textAlign: 'center'
  }
});

// Helper function to format currency
const formatCurrency = (amount) => {
  return `R ${parseFloat(amount).toFixed(2)}`;
};

// Helper function to calculate duration
const calculateDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Create Document Component
const TripPDF = ({ trip, itinerary }) => {
  const duration = calculateDuration(trip.start_date, trip.end_date);
  const dailyBudgetPerPerson = trip.total_budget / (duration * trip.travelers_count);
  const latestItinerary = itinerary;

  const CoverPage = () => (
    <Page size="A4" style={styles.coverPage}>
      <View>
        <Text style={styles.coverTitle}>Travel Itinerary</Text>
        <Text style={styles.coverSubtitle}>{trip.destination_city}</Text>
        
        <View style={{ marginTop: 40 }}>
          <Text style={styles.coverDetails}>
            {new Date(trip.start_date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} - {new Date(trip.end_date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          <Text style={styles.coverDetails}>
            {duration} Days • {trip.travelers_count} Traveler{trip.travelers_count !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.coverDetails}>
            Total Budget: {formatCurrency(trip.total_budget)}
          </Text>
        </View>

        <View style={{ marginTop: 60 }}>
          <Text style={{ ...styles.coverDetails, fontSize: 12 }}>
            Generated by TravelAI • {new Date().toLocaleDateString()}
          </Text>
        </View>
      </View>
    </Page>
  );

  const SummaryPage = () => (
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Trip Summary</Text>
      
      <View style={styles.summaryCard}>
        <Text style={styles.subsectionTitle}>Destination Details</Text>
        <Text style={styles.text}><Text style={styles.textBold}>City:</Text> {trip.destination_city}</Text>
        {trip.destination_country && (
          <Text style={styles.text}><Text style={styles.textBold}>Country:</Text> {trip.destination_country}</Text>
        )}
        <Text style={styles.text}><Text style={styles.textBold}>Duration:</Text> {duration} days</Text>
        <Text style={styles.text}><Text style={styles.textBold}>Travelers:</Text> {trip.travelers_count}</Text>
        <Text style={styles.text}><Text style={styles.textBold}>Total Budget:</Text> {formatCurrency(trip.total_budget)}</Text>
        <Text style={styles.text}><Text style={styles.textBold}>Daily Budget per Person:</Text> {formatCurrency(dailyBudgetPerPerson)}</Text>
      </View>

      {trip.interests && trip.interests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>Travel Interests</Text>
          <View style={styles.list}>
            {trip.interests.map((interest, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.text}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {latestItinerary?.budget_analysis?.budget_summary && (
        <View style={styles.highlightBox}>
          <Text style={styles.highlightText}>
            {latestItinerary.budget_analysis.budget_summary.recommendation}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text>TravelAI - Smart Travel Planning</Text>
      </View>
      <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
    </Page>
  );

  const ItineraryPage = ({ day }) => {
    const travelersCount = day.travelers_count || trip.travelers_count;
    const isGroup = travelersCount > 1;

    return (
      <Page size="A4" style={styles.page}>
        <View style={styles.itineraryDay}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>Day {day.day}: {day.date}</Text>
            {day.weather && (
              <View style={styles.weatherBadge}>
                <Text>{day.weather.max_temp}°C • {day.weather.description}</Text>
              </View>
            )}
          </View>

          {Object.entries(day.activities).map(([timeSlot, activity]) => {
            const costPerPerson = activity.cost?.per_person || activity.cost;
            const totalCost = activity.cost?.total || (activity.cost * travelersCount);

            return (
              <View key={timeSlot} style={styles.activityContainer}>
                <Text style={styles.activityTime}>{timeSlot}</Text>
                <View style={styles.activityDetails}>
                  <Text style={styles.textBold}>{activity.activity}</Text>
                  <Text style={styles.activityLocation}>{activity.location}</Text>
                  
                  {isGroup ? (
                    <View style={styles.costBreakdown}>
                      <View style={styles.costLine}>
                        <Text style={styles.costLabel}>Per person:</Text>
                        <Text style={[styles.costValue, styles.costPerPerson]}>
                          {formatCurrency(costPerPerson)}
                        </Text>
                      </View>
                      <View style={styles.costLine}>
                        <Text style={styles.costLabel}>Total ({travelersCount} people):</Text>
                        <Text style={[styles.costValue, styles.costTotal]}>
                          {formatCurrency(totalCost)}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.costLine}>
                      <Text style={styles.costLabel}>Cost:</Text>
                      <Text style={[styles.costValue, styles.costPerPerson]}>
                        {formatCurrency(costPerPerson)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          <View style={styles.dailySummary}>
            {isGroup ? (
              <>
                <View style={styles.costLine}>
                  <Text style={styles.textBold}>Daily Total per Person:</Text>
                  <Text style={styles.textBold}>
                    {formatCurrency(day.estimated_cost?.per_person || (day.estimated_cost / travelersCount))}
                  </Text>
                </View>
                <View style={styles.costLine}>
                  <Text style={[styles.textBold, styles.costTotal]}>Daily Total for Group:</Text>
                  <Text style={[styles.textBold, styles.costTotal]}>
                    {formatCurrency(day.estimated_cost?.total || day.estimated_cost)}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.costLine}>
                <Text style={styles.textBold}>Daily Total:</Text>
                <Text style={[styles.textBold, styles.costTotal]}>
                  {formatCurrency(day.estimated_cost?.total || day.estimated_cost)}
                </Text>
              </View>
            )}
            
            <View style={styles.costLine}>
              <Text style={styles.costLabel}>Daily Budget per Person:</Text>
              <Text style={styles.costValue}>{formatCurrency(dailyBudgetPerPerson)}</Text>
            </View>
            
            <View style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={[
                styles.budgetStatus,
                day.budget_status === 'within_budget' ? styles.budgetWithin : styles.budgetOver
              ]}>
                {day.budget_status === 'within_budget' ? 'Within Budget' : 'Over Budget'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>TravelAI - Smart Travel Planning</Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
      </Page>
    );
  };

  const PackingListPage = () => (
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Packing List</Text>
      
      {latestItinerary?.budget_analysis?.packing_list ? (
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.subsectionTitle}>Essentials</Text>
            <View style={styles.list}>
              {latestItinerary.budget_analysis.packing_list.essentials.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.text}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.gridItem}>
            <Text style={styles.subsectionTitle}>Clothing</Text>
            <View style={styles.list}>
              {latestItinerary.budget_analysis.packing_list.clothing.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.text}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.gridItem}>
            <Text style={styles.subsectionTitle}>Accessories</Text>
            <View style={styles.list}>
              {latestItinerary.budget_analysis.packing_list.accessories?.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.text}>{item}</Text>
                </View>
              )) || (
                <Text style={styles.textSmall}>No accessories listed</Text>
              )}
            </View>
          </View>

          <View style={styles.gridItem}>
            <Text style={styles.subsectionTitle}>Toiletries</Text>
            <View style={styles.list}>
              {latestItinerary.budget_analysis.packing_list.toiletries?.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.text}>{item}</Text>
                </View>
              )) || (
                <Text style={styles.textSmall}>No toiletries listed</Text>
              )}
            </View>
          </View>
        </View>
      ) : (
        <Text style={styles.text}>No packing list available</Text>
      )}

      <View style={styles.footer}>
        <Text>TravelAI - Smart Travel Planning</Text>
      </View>
      <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
    </Page>
  );

  return (
    <Document>
      {/* Cover Page */}
      <CoverPage />
      
      {/* Summary Page */}
      <SummaryPage />
      
      {/* Itinerary Pages - One page per day to avoid splitting */}
      {latestItinerary?.itinerary_data?.daily_itinerary?.map((day, index) => (
        <ItineraryPage key={index} day={day} />
      ))}
      
      {/* Packing List Page */}
      <PackingListPage />
    </Document>
  );
};

export default TripPDF;