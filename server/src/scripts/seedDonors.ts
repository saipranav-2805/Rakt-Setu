import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Donor } from '../models/Donor.js';
import { BloodGroup, Gender } from '../types/index.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raktsetu';

// Major Indian cities and coordinates for realistic synthetic seeding
const HUBS = [
  { city: 'Hyderabad', lat: 17.385, lng: 78.486, pincode: '500001' },
  { city: 'Bengaluru', lat: 12.971, lng: 77.594, pincode: '560001' },
  { city: 'Delhi', lat: 28.613, lng: 77.209, pincode: '110001' },
  { city: 'Mumbai', lat: 19.076, lng: 72.877, pincode: '400001' }
];

const BLOOD_GROUPS: BloodGroup[] = ['O+', 'O+', 'O+', 'B+', 'B+', 'A+', 'A+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
const GENDERS: Gender[] = ['male', 'male', 'female', 'female', 'other'];

async function seedDonors(count = 5000) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[Seeder] Connected to MongoDB at ${MONGODB_URI}`);
    console.log(`[Seeder] Seeding ${count} synthetic donors across Indian metro hubs...`);

    const batchSize = 1000;
    let totalSeeded = 0;

    for (let b = 0; b < count; b += batchSize) {
      const currentBatchCount = Math.min(batchSize, count - b);
      const userDocs = [];
      const donorDocs = [];

      for (let i = 0; i < currentBatchCount; i++) {
        const hub = HUBS[Math.floor(Math.random() * HUBS.length)];
        // Add realistic jitter (+- ~10 km)
        const latJitter = (Math.random() - 0.5) * 0.18;
        const lngJitter = (Math.random() - 0.5) * 0.18;

        const userId = new mongoose.Types.ObjectId();
        const phone = `+919${Math.floor(100000000 + Math.random() * 900000000)}`;

        userDocs.push({
          _id: userId,
          phone,
          name: `Donor ${b + i + 1}`,
          role: 'donor',
          phoneVerifiedAt: new Date(),
          status: 'active',
          trustScore: 90 + Math.floor(Math.random() * 10)
        });

        const bg = BLOOD_GROUPS[Math.floor(Math.random() * BLOOD_GROUPS.length)];
        const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];
        const ageYears = 19 + Math.floor(Math.random() * 45);
        const dob = new Date(Date.now() - ageYears * 365.25 * 24 * 3600 * 1000);

        donorDocs.push({
          userId,
          bloodGroup: bg,
          gender,
          dob,
          weightKg: 50 + Math.floor(Math.random() * 35),
          location: {
            type: 'Point',
            coordinates: [hub.lng + lngJitter, hub.lat + latJitter]
          },
          city: hub.city,
          pincode: hub.pincode,
          maxTravelKm: 15,
          nextEligibleAt: new Date(Date.now() - 30 * 24 * 3600 * 1000), // currently eligible
          availability: 'available',
          consent: { contact: true, whatsapp: true, version: '1.0', at: new Date() },
          stats: {
            notified: Math.floor(Math.random() * 10),
            accepted: Math.floor(Math.random() * 5),
            declined: Math.floor(Math.random() * 2),
            noResponse: Math.floor(Math.random() * 2),
            donated: Math.floor(Math.random() * 3)
          },
          responseScore: Number((0.6 + Math.random() * 0.4).toFixed(2))
        });
      }

      await User.insertMany(userDocs);
      await Donor.insertMany(donorDocs);
      totalSeeded += currentBatchCount;
      console.log(`[Seeder] Seeded ${totalSeeded}/${count} donors...`);
    }

    console.log(`[Seeder] Seeding completed successfully. Total: ${totalSeeded} donors.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seeder Error]', err);
    process.exit(1);
  }
}

const targetCount = parseInt(process.argv[2] || '5000', 10);
seedDonors(targetCount);
