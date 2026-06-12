export interface Question {
  id: string;
  section: number;
  title: string;
  targetText: string;
  q1_text: string;
  q2_text: string;
  q3_text: string;
  createdAt: any;
  updatedAt: any;
}

export interface Answers {
  part1_q1: 'no_suggestions' | 'has_suggestions' | '';
  part1_q2?: string;
  part1_q3?: string;
  part2_q1: 'no_suggestions' | 'has_suggestions' | '';
  part2_q2?: string;
  part2_q3?: string;
  part3_satisfaction: {
    content: number; // 1 to 5
    communication: number; // 1 to 5
    utilization: number; // 1 to 5
  };
}

export interface SurveyResponse {
  id: string;
  respondentId?: string;
  respondentName: string;
  respondentPosition?: string;
  faculty: string;
  respondentEmail?: string;
  respondentPhone?: string;
  answers: Answers;
  round?: number;
  timestamp: any;
}

export interface AdminProfile {
  email: string;
  name: string;
  lastLogin: any;
}
