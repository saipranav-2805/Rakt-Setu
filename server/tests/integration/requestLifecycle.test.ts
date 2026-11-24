import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Donor } from '../../src/models/Donor.js';
import { RequestModel } from '../../src/models/Request.js';
import { Acceptance } from '../../src/models/Acceptance.js';

describe('API Integration: End-to-End Request Lifecycle & Business Rules', () => {
  const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/raktsetu_test';

  let requesterToken: string;
  let requesterId: string;
  let donorToken: string;
  let donorId: string;
  let createdRequestCode: string;
  let createdRequestId: string;

  const requesterPhone = '+919988776655';
  const donorPhone = '+919988776656';
  const secondDonorPhone = '+919988776657';

  beforeAll(async () => {
    await mongoose.connect(MONGODB_TEST_URI);

    // Clean up test users and requests
    await Promise.all([
      User.deleteMany({ phone: { $in: [requesterPhone, donorPhone, secondDonorPhone] } }),
      RequestModel.deleteMany({ code: /^RS-TEST/ })
    ]);
  });

  afterAll(async () => {
    // Teardown
    const testUsers = await User.find({ phone: { $in: [requesterPhone, donorPhone, secondDonorPhone] } }).select('_id');
    const userIds = testUsers.map((u) => u._id);

    await Promise.all([
      User.deleteMany({ _id: { $in: userIds } }),
      Donor.deleteMany({ userId: { $in: userIds } }),
      RequestModel.deleteMany({ code: /^RS-TEST/ }),
      Acceptance.deleteMany({ requestId: { $in: [createdRequestId] } })
    ]);
    await mongoose.disconnect();
  });

  describe('1. Health & Reference Endpoints', () => {
    it('GET /health returns 200 OK', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /api/v1/facilities/nearby returns list of facilities', async () => {
      const res = await request(app).get('/api/v1/facilities/nearby');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.facilities)).toBe(true);
      expect(res.body.facilities.length).toBeGreaterThan(0);
    });
  });

  describe('2. Authentication Flow (OTP & JWT)', () => {
    it('POST /api/v1/auth/otp/send initiates OTP for requester', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ phone: requesterPhone });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/auth/otp/verify rejects invalid OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ phone: requesterPhone, code: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Invalid OTP/i);
    });

    it('POST /api/v1/auth/otp/verify authenticates requester with valid OTP', async () => {
      // In DEMO_MODE, default OTP is 123456
      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ phone: requesterPhone, code: '123456', name: 'Integration Requester', role: 'requester' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.phone).toBe(requesterPhone);

      requesterToken = res.body.accessToken;
      requesterId = res.body.user.id;
    });

    it('POST /api/v1/auth/otp/verify creates and authenticates donor user', async () => {
      await request(app).post('/api/v1/auth/otp/send').send({ phone: donorPhone });

      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ phone: donorPhone, code: '123456', name: 'Integration Donor', role: 'donor' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      donorToken = res.body.accessToken;
    });
  });

  describe('3. Donor Registration & NBTC Demographic Rules', () => {
    it('rejects underage donor (<18 years old) per NBTC guidelines', async () => {
      const underageDob = new Date();
      underageDob.setFullYear(underageDob.getFullYear() - 16); // 16 years old

      const res = await request(app)
        .post('/api/v1/donors')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          bloodGroup: 'O+',
          gender: 'male',
          dob: underageDob.toISOString().split('T')[0],
          weightKg: 65,
          location: { type: 'Point', coordinates: [78.411, 17.432] },
          city: 'Hyderabad',
          pincode: '500033',
          consent: { contact: true, whatsapp: true, version: '1.0' }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/age/i);
    });

    it('rejects underweight donor (<45 kg) per NBTC guidelines', async () => {
      const res = await request(app)
        .post('/api/v1/donors')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          bloodGroup: 'O+',
          gender: 'male',
          dob: '1995-04-12',
          weightKg: 42, // Under 45 kg
          location: { type: 'Point', coordinates: [78.411, 17.432] },
          city: 'Hyderabad',
          pincode: '500033',
          consent: { contact: true, whatsapp: true, version: '1.0' }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/weight/i);
    });

    it('rejects registration without DPDP Act consent', async () => {
      const res = await request(app)
        .post('/api/v1/donors')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          bloodGroup: 'O+',
          gender: 'male',
          dob: '1995-04-12',
          weightKg: 68,
          location: { type: 'Point', coordinates: [78.411, 17.432] },
          city: 'Hyderabad',
          pincode: '500033',
          consent: { contact: false, whatsapp: true, version: '1.0' }
        });

      expect(res.status).toBe(400);
    });

    it('successfully registers an eligible donor with valid profile and consent', async () => {
      const res = await request(app)
        .post('/api/v1/donors')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          bloodGroup: 'O+',
          gender: 'male',
          dob: '1995-04-12',
          weightKg: 70,
          location: { type: 'Point', coordinates: [78.411, 17.432] },
          city: 'Hyderabad',
          pincode: '500033',
          maxTravelKm: 20,
          consent: { contact: true, whatsapp: true, version: '1.0' }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.donor).toBeDefined();
      expect(res.body.donor.bloodGroup).toBe('O+');
      expect(res.body.donor.availability).toBe('available');
      donorId = res.body.donor._id;
    });
  });

  describe('4. Emergency Request Creation & Public Tracking', () => {
    it('creates an emergency blood request with auto-expanded compatible groups', async () => {
      const res = await request(app)
        .post('/api/v1/requests')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          patient: { age: 42, gender: 'female', bloodGroup: 'A+' },
          unitsNeeded: 1,
          hospital: {
            name: 'Apollo Jubilee Hills Emergency Wing',
            address: 'Road No 72, Jubilee Hills, Hyderabad',
            location: { type: 'Point', coordinates: [78.411, 17.432] }
          },
          urgency: 'critical',
          exactMatchOnly: false
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.request.code).toMatch(/^RS-[A-Z0-9]{6}$/);
      // A+ can receive A+, A-, O+, O-
      expect(res.body.request.compatibleGroups).toEqual(expect.arrayContaining(['A+', 'A-', 'O+', 'O-']));
      expect(res.body.request.state).toBe('OPEN');
      expect(res.body.request.unitsConfirmed).toBe(0);

      createdRequestCode = res.body.request.code;
      createdRequestId = res.body.request._id;
    });

    it('GET /api/v1/requests/:code allows unauthenticated tracking with masked PII', async () => {
      const res = await request(app).get(`/api/v1/requests/${createdRequestCode}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.code).toBe(createdRequestCode);
      expect(res.body.request.unitsNeeded).toBe(1);
      expect(res.body.request.unitsConfirmed).toBe(0);
      expect(res.body.request.hospital.name).toBe('Apollo Jubilee Hills Emergency Wing');
    });
  });

  describe('5. Concurrency & Donor Acceptance', () => {
    it('records donor acceptance and advances request to FULFILLED', async () => {
      const res = await request(app)
        .post(`/api/v1/requests/${createdRequestId}/accept`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donorId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('ACCEPTED');

      // Verify request in DB transitioned to FULFILLED
      const updatedReq = await RequestModel.findById(createdRequestId);
      expect(updatedReq?.unitsConfirmed).toBe(1);
      expect(updatedReq?.state).toBe('FULFILLED');
    });

    it('subsequent acceptance on fulfilled request gets WAITLISTED with no over-allocation', async () => {
      // Create a second donor to compete for the same request
      const secondDonorUser = await User.create({
        phone: '+919988776657',
        name: 'Second Donor Candidate',
        role: 'donor',
        status: 'active'
      });
      const secondDonor = await Donor.create({
        userId: secondDonorUser._id,
        bloodGroup: 'A+',
        gender: 'female',
        dob: new Date('1996-01-01'),
        location: { type: 'Point', coordinates: [78.411, 17.432] },
        city: 'Hyderabad',
        pincode: '500033',
        availability: 'available',
        nextEligibleAt: new Date('2020-01-01'),
        consent: { contact: true, whatsapp: true, version: '1.0' }
      });

      // Simulate second donor attempting to accept the already-fulfilled 1-unit request
      const res = await request(app)
        .post(`/api/v1/requests/${createdRequestId}/accept`)
        .send({ donorId: secondDonor._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('WAITLISTED');

      // Units confirmed must remain strictly 1
      const reqAfter = await RequestModel.findById(createdRequestId);
      expect(reqAfter?.unitsConfirmed).toBe(1);
    });

    it('requester sees unlocked contact details for accepted donor', async () => {
      const res = await request(app)
        .get(`/api/v1/requests/${createdRequestCode}`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      const acceptances = res.body.request.acceptances;
      expect(acceptances.length).toBeGreaterThan(0);

      const acceptedItem = acceptances.find((a: any) => a.status === 'ACCEPTED');
      expect(acceptedItem).toBeDefined();
      expect(acceptedItem.contactUnlocked).toBe(true);
      expect(acceptedItem.phone).toBe(donorPhone);
    });
  });

  describe('6. Request Cancellation & State Machine Enforcement', () => {
    let cancelRequestId: string;
    let cancelRequestCode: string;

    it('creates and then cancels a request', async () => {
      const createRes = await request(app)
        .post('/api/v1/requests')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          patient: { age: 50, gender: 'male', bloodGroup: 'B+' },
          unitsNeeded: 2,
          hospital: {
            name: 'City Care Hospital',
            address: 'Somajiguda, Hyderabad',
            location: { type: 'Point', coordinates: [78.45, 17.42] }
          },
          urgency: 'urgent'
        });

      cancelRequestId = createRes.body.request._id;
      cancelRequestCode = createRes.body.request.code;

      const cancelRes = await request(app)
        .post(`/api/v1/requests/${cancelRequestId}/close`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ state: 'CANCELLED', reason: 'Units arranged from alternative source' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.request.state).toBe('CANCELLED');

      // Attempt to accept on cancelled request
      const acceptRes = await request(app)
        .post(`/api/v1/requests/${cancelRequestId}/accept`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donorId });

      // Cannot accept cancelled request; returned waitlisted / not incremented
      expect(acceptRes.body.status).toBe('WAITLISTED');
      const reqDoc = await RequestModel.findById(cancelRequestId);
      expect(reqDoc?.unitsConfirmed).toBe(0);
      expect(reqDoc?.state).toBe('CANCELLED');

      // Cleanup
      await RequestModel.findByIdAndDelete(cancelRequestId);
    });
  });
});
