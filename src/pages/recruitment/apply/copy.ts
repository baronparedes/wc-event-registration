import type { RecruitmentRole } from '@/lib/domain/recruitment';

export const RECRUITMENT_ROLE_OVERVIEW_INTRO =
  'We have the following roles available from which you can choose. Please take a few moments to read through.';

export const RECRUITMENT_ROLE_RESPONSIBILITIES: Record<RecruitmentRole, string> = {
  'Prayer Coach':
    "Provides a warm and friendly welcome to the guests, gives information about CCF and its ministries, prays for the guests, and shares the gospel as needed.\n\n**This role requires that you have completed CCF's GLC LEVEL 1 (Book 1 to 4).**",
  Usher:
    "Stationed at the entrance of the Welcome Center to serve as greeters for incoming guests as well as provide support to other volunteers.\n\n- Provides logistical materials needed by the prayer coaches to attend to the guests.\n- Collects and reports data to support church and ministry planning.\n\n**This role requires that you have completed CCF's GLC LEVEL 1 (Book 1 to 4).**",
  'VMT Support':
    "To assist VMT in the recruitment process on Sundays and to follow up on WC volunteers for updates and data gathering.\n\nKnowledgeable in MS Office or willing to be trained.\n\n**This role requires that you have completed CCF's GLC LEVEL 1 (Book 1 to 4).**",
  'IMT Support':
    "To assist IMT in the Guest DGroup Placement on Sundays and to follow up on guests for updates and data gathering.\n\nKnowledgeable in MS Office or willing to be trained.\n\n**This role requires that you have completed CCF's GLC LEVEL 1 (Book 1 to 4).**",
  'Backroom Support': '[Replace with approved Backroom Support responsibilities.]',
};

export const RECRUITMENT_PRIVACY_WAIVER_NOTICE =
  'The information collected and stored will be used solely for the purpose of the CCF WC Ministry, which is not limited to the application and registration process during related events and activities. Changes will only be made upon the collection of updates by CCF WC Ministry and/or the request of the participant. Any and all disposal of data will be carried out securely and within the timeframe provided by CCF. Information stored in a third-party database system is subject to the privacy policy of CCF. The participant waives any and all possible liability upon the disclosure of personal data to CCF.';

export const RECRUITMENT_APPLICANT_ATTESTATION = [
  'I am a committed member of a DGroup.',
  'I am saved by grace through faith in Jesus and experiencing life transformation.',
  'I pursue spiritual disciplines such as consistent prayer and quiet time.',
  'I do my best to honor God through a daily lifestyle that is above reproach and does not indulge in worldly pleasures and gossiping.',
  'I will practice sexual purity and forgiveness.',
  'I am not involved in a romantic relationship with an unbeliever.',
  'I manage my finances well by minimizing debt and tithing regularly.',
  'I do my best to live a life of integrity in public, private, and social media.',
  'I have a teachable and humble heart, open to accountability and correction by my DGroup and ministry leader.',
  'I want to be used by God to disciple others and help to disciple others.',
  'I have completed GLC Level 1 (Book 1 to 4).',
  "I know by heart CCF's mission and vision.",
] as const;

export const RECRUITMENT_APPLICANT_ATTESTATION_CONFIRMATION =
  'I confirm the truth of the foregoing and hereby commit with all my heart to continue living my life pursuant to these principles.';
