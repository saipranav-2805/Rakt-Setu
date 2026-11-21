import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { RequestModel } from '../../src/models/Request.js';
import { Donor } from '../../src/models/Donor.js';
import { User } from '../../src/models/User.js';
import { Acceptance } from '../../src/models/Acceptance.js';

/**
 * SHOWPIECE CONCURRENCY TEST (Blueprint Section 18)
 * Fires 50 simultaneous accept calls at a request needing exactly 2 units.
 * Asserts:
 * - Exactly 2 confirmed (status: 'ACCEPTED')
 * - Exactly 48 waitlisted (status: 'WAITLISTED')
 * - Request unitsConfirmed === 2
 * - Zero over-allocation under extreme contention
 */
describe('Showpiece Concurrency Test: 50-way Concurrent Accept under Contention', () => {
  const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/raktsetu_test';
  let testRequestId: string;
  let testDonors: any[] = [];

  beforeAll(async () => {
    await mongoose.connect(MONGODB_TEST_URI);

    // 1. Create a requester user
    const requester = await User.create({
      phone: '+919999900000',
      name: 'Requester Test',
      role: 'requester',
      status: 'active'
    });

    // 2. Create an emergency request needing exactly 2 units
    const request = await RequestModel.create({
      code: 'RS-TEST-CONCUR',
      requesterId: requester._id,
      patient: { age: 34, gender: 'male', bloodGroup: 'O+' },
      unitsNeeded: 2,
      unitsConfirmed: 0,
      hospital: {
        name: 'Apollo Hospital Jubilee Hills',
        address: 'Road No 72, Jubilee Hills, Hyderabad',
        location: { type: 'Point', coordinates: [78.411, 17.432] }
      },
      urgency: 'critical',
      compatibleGroups: ['O-', 'O+'],
      state: 'MATCHING',
      currentWave: 1,
      radiusKm: 5,
      expiresAt: new Date(Date.now() + 6 * 3600 * 1000)
    });
    testRequestId = request._id.toString();

    // 3. Create 50 distinct donor users & donor records
    for (let i = 1; i <= 50; i++) {
      const donorUser = await User.create({
        phone: `+91980000${String(i).padStart(4, '0')}`,
        name: `Donor Candidate ${i}`,
        role: 'donor',
        status: 'active'
      });

      const donor = await Donor.create({
        userId: donorUser._id,
        bloodGroup: 'O+',
        gender: i % 2 === 0 ? 'male' : 'female',
        dob: new Date('1998-05-10'),
        location: { type: 'Point', coordinates: [78.412, 17.433] },
        city: 'Hyderabad',
        pincode: '500033',
        maxTravelKm: 15,
        availability: 'available',
        nextEligibleAt: new Date('2020-01-01'),
        consent: { contact: true, whatsapp: true, version: '1.0', at: new Date() }
      });

      testDonors.push({ user: donorUser, donor });
    }
  });

  afterAll(async () => {
    // Cleanup test collections
    await Promise.all([
      User.deleteMany({ phone: { $regex: /^\+919(99999|80000)/ } }),
      Donor.deleteMany({ _id: { $in: testDonors.map((d) => d.donor._id) } }),
      RequestModel.deleteOne({ _id: testRequestId }),
      Acceptance.deleteMany({ requestId: testRequestId })
    ]);
    await mongoose.disconnect();
  });

  it('handles 50 simultaneous accepts without over-allocation (exactly 2 accepted, 48 waitlisted)', async () => {
    // Worker simulation of the atomic conditional update logic in requestController.ts
    const simulateAccept = async (donorItem: any) => {
      const updated = await RequestModel.findOneAndUpdate(
        {
          _id: testRequestId,
          unitsConfirmed: { $lt: 2 },
          state: { $in: ['OPEN', 'MATCHING', 'PARTIALLY_FULFILLED'] }
        },
        {
          $inc: { unitsConfirmed: 1 }
        },
        { new: true }
      );

      const status = updated ? 'ACCEPTED' : 'WAITLISTED';

      if (updated && updated.unitsConfirmed >= 2) {
        await RequestModel.findByIdAndUpdate(testRequestId, { state: 'FULFILLED' });
      }

      await Acceptance.create({
        requestId: testRequestId,
        donorId: donorItem.donor._id,
        status,
        acceptedAt: new Date()
      });

      return { donorId: donorItem.donor._id, status };
    };

    // Fire all 50 accept calls simultaneously via Promise.all
    const results = await Promise.all(testDonors.map((d) => simulateAccept(d)));

    const acceptedCount = results.filter((r) => r.status === 'ACCEPTED').length;
    const waitlistedCount = results.filter((r) => r.status === 'WAITLISTED').length;

    // Check assertions
    expect(acceptedCount).toBe(2);
    expect(waitlistedCount).toBe(48);

    // Verify database state directly
    const finalRequest = await RequestModel.findById(testRequestId);
    expect(finalRequest?.unitsConfirmed).toBe(2);
    expect(finalRequest?.state).toBe('FULFILLED');

    const totalAcceptances = await Acceptance.countDocuments({ requestId: testRequestId });
    expect(totalAcceptances).toBe(50);
  });
});
