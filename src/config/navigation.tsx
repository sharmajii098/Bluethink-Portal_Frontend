import type { ReactNode } from "react";
import type { Role } from "../types/auth";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import BeachAccessRoundedIcon from "@mui/icons-material/BeachAccessRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import MiscellaneousServicesRoundedIcon from "@mui/icons-material/MiscellaneousServicesRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";

export type NavigationChild = {
  label: string;
  path: string;
};

export type NavigationSection = {
  label: string;
  icon: ReactNode;
  path?: string;
  children?: NavigationChild[];
};

const item = (label: string, path: string): NavigationChild => ({ label, path });

const accountChildren = [
  item("My Profile", "profile"),
  item("Working Hours", "working-hours"),
  item("Profile Completion", "profile-completion"),
  item("Security & Sessions", "security"),
  item("Login Locations", "login-locations"),
  item("Settings", "settings"),
];

const communicationChildren = [
  item("Announcements", "announcements"),
  item("Notifications", "notifications"),
  item("HR Calendar & Events", "hr-calendar"),
  item("Calendar Connections", "calendar-connections"),
];

const complianceChildren = [
  item("Documents", "documents"),
  item("Employment Contracts", "employment-contracts"),
  item("Policies & Compliance", "policies"),
  item("Policy Acknowledgements", "policy-acknowledgements"),
  item("Policy Assistant", "policy-assistant"),
  item("Compliance Tracker", "compliance-records"),
  item("Privacy & Consent", "privacy-consents"),
];

export const ROLE_NAVIGATION: Record<Role, NavigationSection[]> = {
  ADMIN: [
    { label: "Staff approvals", icon: <DescriptionRoundedIcon />, path: "staff-approvals" },
    { label: "Dashboard", icon: <DashboardRoundedIcon />, path: "dashboard" },
    { label: "Team Chat", icon: <ForumRoundedIcon />, path: "team-chat" },
    { label: "Daily Stand-up", icon: <EventAvailableRoundedIcon />, path: "daily-standup" },
    { label: "BlueThink AI Assistant", icon: <AutoAwesomeRoundedIcon />, path: "ai-assistant" },
    {
      label: "People & Organization",
      icon: <PeopleAltRoundedIcon />,
      children: [
        item("Employee Management", "employees"),
        item("Departments", "departments"),
        item("Employee Hierarchy", "employee-hierarchy"),
        item("Learning & Shadow Hierarchy", "mentorships"),
        item("Employee Lifecycle", "employee-lifecycle"),
        item("Employee Transfers", "employee-transfers"),
        item("Employment Contracts", "employment-contracts"),
        item("Employee Data Quality", "employee-data-quality"),
        item("Profile Completion", "profile-completion"),
      ],
    },
    {
      label: "Attendance, Leave & Shifts",
      icon: <EventAvailableRoundedIcon />,
      children: [
        item("Attendance", "attendance"),
        item("Leave Requests", "leave"),
        item("Leave Configuration", "leave/configuration"),
        item("Attendance Regularization", "attendance-regularization"),
        item("Work From Home", "wfh"),
        item("Overtime & Comp-Off", "overtime"),
        item("Workforce Scheduling", "workforce"),
        item("Shift Swap Requests", "shift-swaps"),
        item("Shift Preferences", "shift-preferences"),
        item("Holiday Calendar", "holidays"),
        item("Leave Encashment", "leave-encashments"),
        item("Leave Donation & Transfer", "leave-donations"),
        item("Employee Availability", "employee-availability"),
        item("Flexible Work Arrangements", "flexible-work-requests"),
      ],
    },
    {
      label: "Payroll & Benefits",
      icon: <PaymentsRoundedIcon />,
      children: [
        item("Salary Records", "salary"),
        item("Attendance Reconciliation", "payroll-reconciliation"),
        item("Approved Payroll Policies", "payroll-policies"),
        item("Payslips", "payslips"),
        item("Payroll & Bank Change Requests", "payroll-change-requests"),
        item("Tax Declarations", "tax-declarations"),
        item("Benefits & Insurance", "benefits"),
        item("Loans & Salary Advances", "loans"),
        item("Compensation Analytics", "compensation-analytics"),
        item("Employee Cost Analytics", "employee-cost-analytics"),
      ],
    },
    {
      label: "Talent & Performance",
      icon: <WorkspacePremiumRoundedIcon />,
      children: [
        item("Performance & Goals", "performance"),
        item("Training & Learning", "training"),
        item("Training Compliance", "training-compliance"),
        item("Learning Effectiveness", "learning-effectiveness"),
        item("Recruitment & Onboarding", "recruitment"),
        item("Career Development", "career-movements"),
        item("Internal Jobs & Mobility", "internal-mobility"),
        item("Succession Planning", "talent-succession"),
        item("Skills & Competencies", "employee-skills"),
        item("360° Feedback", "employee-360-feedback"),
        item("Probation & Confirmation", "probation"),
        item("Employee Referral Program", "referrals"),
        item("Recognition & Rewards", "recognition"),
        item("Employee Pulse Surveys", "surveys"),
        item("Milestones & Celebrations", "employee-milestones"),
        item("Manager 1:1 & Check-ins", "manager-one-on-ones"),
      ],
    },
    {
      label: "Operations & Services",
      icon: <WorkOutlineRoundedIcon />,
      children: [
        item("Project Management", "projects"),
        item("Timesheet Management", "timesheets/all"),
        item("Expenses & Reimbursements", "expenses"),
        item("Business Travel", "travel"),
        item("Assets & Equipment", "assets"),
        item("Employee Asset Requests", "asset-requests"),
        item("Transport & Parking", "transport-requests"),
        item("ID Card & Access Requests", "access-card-requests"),
        item("Letters & Certificates", "letters"),
        item("HR Letter Templates", "letter-templates"),
        item("Helpdesk & IT Support", "support"),
        item("HR Service Requests", "hr-service-requests"),
        item("Grievance & Case Management", "grievances"),
        item("Workplace Safety & Incidents", "workplace-incidents"),
        item("Separation & Offboarding", "separation"),
        item("Employee Suggestions", "employee-suggestions"),
      ],
    },
    {
      label: "Documents, Policy & Communication",
      icon: <GavelRoundedIcon />,
      children: [
        item("Documents", "documents"),
        item("Document Expiry Dashboard", "document-expiry-dashboard"),
        item("Announcements", "announcements"),
        item("Policies & Compliance", "policies"),
        item("Policy Acknowledgements", "policy-acknowledgements"),
        item("Compliance Tracker", "compliance-records"),
        item("Privacy & Consent", "privacy-consents"),
        item("Notifications", "notifications"),
        item("HR Calendar & Events", "hr-calendar"),
  item("Calendar Connections", "calendar-connections"),
      ],
    },
    {
      label: "Analytics, Reports & Audit",
      icon: <AssessmentRoundedIcon />,
      children: [
        item("Employee Reports", "reports/employee"),
        item("Attendance Reports", "reports/attendance"),
        item("Payroll Reports", "reports/payroll"),
        item("Project Reports", "reports/projects"),
        item("Workforce Analytics", "workforce-analytics"),
        item("Attendance & Leave Risk", "attendance-leave-risk"),
        item("HR Case SLA Dashboard", "hr-case-sla"),
        item("Activity & Audit Logs", "activity-audit"),
      ],
    },
    {
      label: "Account & System",
      icon: <SettingsRoundedIcon />,
      children: accountChildren,
    },
  ],

  HR: [
    { label: "My requests", icon: <DescriptionRoundedIcon />, path: "my-requests" },
    { label: "Dashboard", icon: <DashboardRoundedIcon />, path: "dashboard" },
    { label: "BlueThink AI Assistant", icon: <AutoAwesomeRoundedIcon />, path: "ai-assistant" },
    { label: "Team Chat", icon: <ForumRoundedIcon />, path: "team-chat" },
    { label: "Daily Stand-up", icon: <EventAvailableRoundedIcon />, path: "daily-standup" },
    {
      label: "People & Organization",
      icon: <PeopleAltRoundedIcon />,
      children: [
        item("Employee Management", "employees"),
        item("Departments", "departments"),
        item("Learning & Shadow Hierarchy", "mentorships"),
        item("Employee Lifecycle", "employee-lifecycle"),
        item("Employee Transfers", "employee-transfers"),
        item("Employment Contracts", "employment-contracts"),
        item("Employee Data Quality", "employee-data-quality"),
        item("Profile Completion", "profile-completion"),
      ],
    },
    {
      label: "Attendance, Leave & Shifts",
      icon: <EventAvailableRoundedIcon />,
      children: [
        item("My & Organization Attendance", "attendance"),
        item("My Leave & Leave Management", "leave"),
        item("Attendance Regularization", "attendance-regularization"),
        item("Work From Home", "wfh"),
        item("Overtime & Comp-Off", "overtime"),
        item("Workforce Scheduling", "workforce"),
        item("Shift Swap Requests", "shift-swaps"),
        item("Shift Preferences", "shift-preferences"),
        item("Holiday Calendar", "holidays"),
        item("Leave Encashment", "leave-encashments"),
        item("Leave Donation & Transfer", "leave-donations"),
        item("Employee Availability", "employee-availability"),
        item("Flexible Work Arrangements", "flexible-work-requests"),
      ],
    },
    {
      label: "Payroll & Benefits",
      icon: <PaymentsRoundedIcon />,
      children: [
        item("Salary Records", "salary"),
        item("Attendance Reconciliation", "payroll-reconciliation"),
        item("Approved Payroll Policies", "payroll-policies"),
        item("Salary Structures", "salary/structures"),
        item("Generate Payroll", "salary/generate"),
        item("Payslips", "payslips"),
        item("Payroll & Bank Change Requests", "payroll-change-requests"),
        item("Tax Declarations", "tax-declarations"),
        item("Benefits & Insurance", "benefits"),
        item("Loans & Salary Advances", "loans"),
        item("Compensation Analytics", "compensation-analytics"),
        item("Employee Cost Analytics", "employee-cost-analytics"),
      ],
    },
    {
      label: "Talent & Performance",
      icon: <WorkspacePremiumRoundedIcon />,
      children: [
        item("Performance & Goals", "performance"),
        item("Training & Learning", "training"),
        item("Training Compliance", "training-compliance"),
        item("Learning Effectiveness", "learning-effectiveness"),
        item("Recruitment & Onboarding", "recruitment"),
        item("Career Development", "career-movements"),
        item("Internal Jobs & Mobility", "internal-mobility"),
        item("Succession Planning", "talent-succession"),
        item("Skills & Competencies", "employee-skills"),
        item("360° Feedback", "employee-360-feedback"),
        item("Probation & Confirmation", "probation"),
        item("Employee Referral Program", "referrals"),
        item("Recognition & Rewards", "recognition"),
        item("Employee Pulse Surveys", "surveys"),
        item("Milestones & Celebrations", "employee-milestones"),
        item("Manager 1:1 & Check-ins", "manager-one-on-ones"),
      ],
    },
    {
      label: "Operations & Services",
      icon: <MiscellaneousServicesRoundedIcon />,
      children: [
        item("Projects", "projects"),
        item("My & Employee Timesheets", "timesheets"),
        item("Expenses & Reimbursements", "expenses"),
        item("Business Travel", "travel"),
        item("Assets & Equipment", "assets"),
        item("Employee Asset Requests", "asset-requests"),
        item("Transport & Parking", "transport-requests"),
        item("ID Card & Access Requests", "access-card-requests"),
        item("Letters & Certificates", "letters"),
        item("HR Letter Templates", "letter-templates"),
        item("Helpdesk & IT Support", "support"),
        item("HR Service Requests", "hr-service-requests"),
        item("Grievance & Case Management", "grievances"),
        item("Workplace Safety & Incidents", "workplace-incidents"),
        item("Separation & Offboarding", "separation"),
        item("Employee Suggestions", "employee-suggestions"),
      ],
    },
    {
      label: "Documents, Policy & Communication",
      icon: <GavelRoundedIcon />,
      children: [
        item("Documents", "documents"),
        item("Document Expiry Dashboard", "document-expiry-dashboard"),
        item("Announcements", "announcements"),
        item("Policies & Compliance", "policies"),
        item("Policy Acknowledgements", "policy-acknowledgements"),
        item("Compliance Tracker", "compliance-records"),
        item("Privacy & Consent", "privacy-consents"),
        item("Notifications", "notifications"),
        item("HR Calendar & Events", "hr-calendar"),
  item("Calendar Connections", "calendar-connections"),
      ],
    },
    {
      label: "Analytics, Reports & Audit",
      icon: <AssessmentRoundedIcon />,
      children: [
        item("Employee Reports", "reports/employee"),
        item("Attendance Reports", "reports/attendance"),
        item("Payroll Reports", "reports/payroll"),
        item("Project Reports", "reports/projects"),
        item("Workforce Analytics", "workforce-analytics"),
        item("Attendance & Leave Risk", "attendance-leave-risk"),
        item("HR Case SLA Dashboard", "hr-case-sla"),
        item("Activity & Audit Logs", "activity-audit"),
      ],
    },
    {
      label: "Account & System",
      icon: <SettingsRoundedIcon />,
      children: accountChildren,
    },
  ],

  MANAGER: [
    { label: "My requests", icon: <DescriptionRoundedIcon />, path: "my-requests" },
    { label: "Dashboard", icon: <DashboardRoundedIcon />, path: "dashboard" },
    { label: "BlueThink AI Assistant", icon: <AutoAwesomeRoundedIcon />, path: "ai-assistant" },
    { label: "Team Chat", icon: <ForumRoundedIcon />, path: "team-chat" },
    { label: "Daily Stand-up", icon: <EventAvailableRoundedIcon />, path: "daily-standup" },
    {
      label: "Team Management",
      icon: <GroupsRoundedIcon />,
      children: [
        item("My Team", "team"),
        item("Mentorship & Shadowing", "mentorships"),
        item("My & Team Attendance", "attendance"),
        item("My Leave & Team Approvals", "leave"),
        item("My & Team Timesheets", "timesheets"),
        item("Projects", "projects"),
        item("Approval Inbox", "approval-inbox"),
        item("Manager 1:1 & Check-ins", "manager-one-on-ones"),
        item("360° Feedback", "employee-360-feedback"),
        item("Succession & Talent Pool", "talent-succession"),
        item("Employee Availability", "employee-availability"),
      ],
    },
    {
      label: "Time, Leave & Scheduling",
      icon: <BeachAccessRoundedIcon />,
      children: [
        item("Work From Home", "wfh"),
        item("Attendance Regularization", "attendance-regularization"),
        item("Overtime & Comp-Off", "overtime"),
        item("Workforce Scheduling", "workforce"),
        item("Shift Swap Requests", "shift-swaps"),
        item("Shift Preferences", "shift-preferences"),
        item("Holiday Calendar", "holidays"),
        item("Flexible Work Arrangements", "flexible-work-requests"),
        item("Leave Encashment", "leave-encashments"),
        item("Leave Donation & Transfer", "leave-donations"),
      ],
    },
    {
      label: "Talent & Engagement",
      icon: <SchoolRoundedIcon />,
      children: [
        item("Performance & Goals", "performance"),
        item("Training & Learning", "training"),
        item("Career Development", "career-movements"),
        item("Internal Jobs & Mobility", "internal-mobility"),
        item("Skills & Competencies", "employee-skills"),
        item("Probation & Confirmation", "probation"),
        item("Employee Referral Program", "referrals"),
        item("Recognition & Rewards", "recognition"),
        item("Employee Pulse Surveys", "surveys"),
        item("Milestones & Celebrations", "employee-milestones"),
      ],
    },
    {
      label: "Pay & Benefits",
      icon: <PaymentsRoundedIcon />,
      children: [
        item("My & Team Salary", "salary"),
        item("My & Team Payslips", "payslips"),
        item("Payroll & Bank Change Requests", "payroll-change-requests"),
        item("Tax Declaration & Proof", "tax-declarations"),
        item("Benefits & Insurance", "benefits"),
        item("Loans & Salary Advances", "loans"),
      ],
    },
    {
      label: "Requests & Services",
      icon: <SupportAgentRoundedIcon />,
      children: [
        item("Expenses & Reimbursements", "expenses"),
        item("Business Travel", "travel"),
        item("Employee Asset Requests", "asset-requests"),
        item("Transport & Parking", "transport-requests"),
        item("ID Card & Access Requests", "access-card-requests"),
        item("Letters & Certificates", "letters"),
        item("Benefits & Insurance", "benefits"),
        item("Loans & Salary Advances", "loans"),
        item("Data Change Requests", "data-change-requests"),
        item("Employee Transfers", "employee-transfers"),
        item("Emergency Contacts", "emergency-contacts"),
        item("Beneficiaries & Nominees", "beneficiaries"),
        item("Helpdesk & IT Support", "support"),
        item("HR Service Requests", "hr-service-requests"),
        item("Grievance & Case Management", "grievances"),
        item("Workplace Safety & Incidents", "workplace-incidents"),
        item("Separation & Offboarding", "separation"),
      ],
    },
    {
      label: "Documents & Communication",
      icon: <DescriptionRoundedIcon />,
      children: [
        ...complianceChildren,
        ...communicationChildren,
        item("Employee Suggestions", "employee-suggestions"),
      ],
    },
    {
      label: "Account",
      icon: <AccountCircleRoundedIcon />,
      children: [
        ...accountChildren,
        item("My Activity", "activity-audit"),
      ],
    },
  ],

  EMPLOYEE: [
    { label: "My requests", icon: <DescriptionRoundedIcon />, path: "my-requests" },
    { label: "Dashboard", icon: <DashboardRoundedIcon />, path: "dashboard" },
    { label: "BlueThink AI Assistant", icon: <AutoAwesomeRoundedIcon />, path: "ai-assistant" },
    { label: "Team Chat", icon: <ForumRoundedIcon />, path: "team-chat" },
    { label: "Daily Stand-up", icon: <EventAvailableRoundedIcon />, path: "daily-standup" },
    {
      label: "My Time & Leave",
      icon: <EventAvailableRoundedIcon />,
      children: [
        item("Attendance", "attendance"),
        item("My Leave", "leave"),
        item("My Timesheets", "timesheets"),
        item("Work From Home", "wfh"),
        item("Attendance Regularization", "attendance-regularization"),
        item("My Shift & Schedule", "workforce"),
        item("Overtime & Comp-Off", "overtime"),
        item("Holiday Calendar", "holidays"),
        item("Shift Swap Requests", "shift-swaps"),
        item("Shift Preferences", "shift-preferences"),
        item("Flexible Work Arrangements", "flexible-work-requests"),
        item("Leave Encashment", "leave-encashments"),
        item("Leave Donation & Transfer", "leave-donations"),
        item("Out of Office & Availability", "employee-availability"),
      ],
    },
    {
      label: "My Career & Growth",
      icon: <WorkspacePremiumRoundedIcon />,
      children: [
        item("My Projects", "projects"),
        item("My 1:1 Check-ins", "manager-one-on-ones"),
        item("My Mentor & Shadowing", "mentorships"),
        item("Performance & Goals", "performance"),
        item("Training & Learning", "training"),
        item("Career Development", "career-movements"),
        item("My Succession & Talent Plan", "my-succession-plan"),
        item("Internal Jobs & Mobility", "internal-mobility"),
        item("Skills & Competencies", "employee-skills"),
        item("360° Feedback", "employee-360-feedback"),
        item("Probation & Confirmation", "probation"),
        item("Employee Referral Program", "referrals"),
        item("Recognition & Rewards", "recognition"),
        item("Milestones & Celebrations", "employee-milestones"),
      ],
    },
    {
      label: "Pay & Benefits",
      icon: <PaymentsRoundedIcon />,
      children: [
        item("My Salary", "salary"),
        item("Payslips & Salary Statement", "payslips"),
        item("Payroll & Bank Change Requests", "payroll-change-requests"),
        item("Tax Declaration & Proof", "tax-declarations"),
        item("Benefits & Insurance", "benefits"),
        item("Loans & Salary Advances", "loans"),
      ],
    },
    {
      label: "Requests & Services",
      icon: <SupportAgentRoundedIcon />,
      children: [
        item("Expenses & Reimbursements", "expenses"),
        item("Business Travel", "travel"),
        item("Employee Asset Requests", "asset-requests"),
        item("Transport & Parking", "transport-requests"),
        item("ID Card & Access Requests", "access-card-requests"),
        item("Letters & Certificates", "letters"),
        item("Data Change Requests", "data-change-requests"),
        item("Employee Transfers", "employee-transfers"),
        item("Emergency Contacts & Dependents", "emergency-contacts"),
        item("Beneficiaries & Nominees", "beneficiaries"),
        item("Helpdesk & IT Support", "support"),
        item("HR Service Requests", "hr-service-requests"),
        item("Grievance & Case Management", "grievances"),
        item("Workplace Safety & Incidents", "workplace-incidents"),
        item("Separation & Offboarding", "separation"),
      ],
    },
    {
      label: "Documents & Compliance",
      icon: <GavelRoundedIcon />,
      children: complianceChildren,
    },
    {
      label: "Communication & Feedback",
      icon: <CampaignRoundedIcon />,
      children: [
        ...communicationChildren,
        item("Employee Pulse Surveys", "surveys"),
        item("Suggestions & Feedback", "employee-suggestions"),
      ],
    },
    {
      label: "Account",
      icon: <AccountCircleRoundedIcon />,
      children: [
        ...accountChildren,
        item("My Activity", "activity-audit"),
      ],
    },
  ],
};

export function flattenNavigation(sections: NavigationSection[]) {
  return sections.flatMap((section) => {
    if (section.path) {
      return [{ label: section.label, path: section.path, group: "" }];
    }
    return (section.children ?? []).map((child) => ({
      ...child,
      group: section.label,
    }));
  });
}
