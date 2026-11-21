import { Types } from 'mongoose';
import { Donor, IDonor } from '../../models/Donor.js';
import { NotificationModel } from '../../models/Notification.js';
import { BloodGroup, GeoPoint } from '../../types/index.js';
import { COOLDOWN_CONFIG } from '../../config/cooldown.js';

export interface CandidateQueryOptions {
  hospitalLocation: GeoPoint;
  compatibleGroups: BloodGroup[];
  radiusKm: number;
  requestId: Types.ObjectId | string;
}

export interface CandidateWithDistance {
  donor: IDonor;
  distanceKm: number;
}

/**
 * Geospatial Candidate Selection Algorithm
 * Strictly implements Section 12.1 of the Blueprint:
 * 1. Query donors with $geoNear on location within R km
 * 2. Filter by bloodGroup in G, availability = available, nextEligibleAt <= now, status = active, consent granted
 * 3. Exclude donors already notified for this request
 * 4. Exclude donors notified of ANY request in the last 24 hours (fatigue limit)
 * 5. Apply gender/age/weight bounds
 */
export async function findEligibleCandidates(
  options: CandidateQueryOptions
): Promise<CandidateWithDistance[]> {
  const now = new Date();
  const radiusMeters = options.radiusKm * 1000;
  const fatigueThreshold = new Date(now.getTime() - COOLDOWN_CONFIG.FATIGUE_LIMIT_HOURS * 60 * 60 * 1000);

  // 1. Identify donors already notified for THIS request
  const alreadyNotifiedForRequest = await NotificationModel.find({
    requestId: options.requestId
  }).distinct('donorId');

  // 2. Identify donors fatigued by ANY notification in the last 24 hours
  const fatiguedDonors = await NotificationModel.find({
    createdAt: { $gte: fatigueThreshold }
  }).distinct('donorId');

  // Excluded IDs combined
  const excludedDonorIds = [
    ...new Set([
      ...alreadyNotifiedForRequest.map((id) => id.toString()),
      ...fatiguedDonors.map((id) => id.toString())
    ])
  ].map((id) => new Types.ObjectId(id));

  // Date of birth bounds for Age 18 - 65
  const maxDob = new Date(now.getFullYear() - COOLDOWN_CONFIG.MIN_DONOR_AGE, now.getMonth(), now.getDate());
  const minDob = new Date(now.getFullYear() - COOLDOWN_CONFIG.MAX_DONOR_AGE, now.getMonth(), now.getDate());

  // 3. Execute $geoNear aggregation
  const pipeline: any[] = [
    {
      $geoNear: {
        near: options.hospitalLocation,
        distanceField: 'distanceMeters',
        maxDistance: radiusMeters,
        spherical: true,
        query: {
          _id: { $nin: excludedDonorIds },
          bloodGroup: { $in: options.compatibleGroups },
          availability: 'available',
          nextEligibleAt: { $lte: now },
          'consent.contact': true,
          'consent.whatsapp': true,
          dob: { $gte: minDob, $lte: maxDob },
          $or: [
            { weightKg: { $exists: false } },
            { weightKg: { $gte: COOLDOWN_CONFIG.MIN_WEIGHT_KG } }
          ]
        }
      }
    },
    // Populate user to ensure user status is active
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $match: {
        'user.status': 'active'
      }
    }
  ];

  const results = await Donor.aggregate(pipeline).exec();

  return results.map((doc: any) => ({
    donor: doc,
    distanceKm: Number((doc.distanceMeters / 1000).toFixed(2))
  }));
}
