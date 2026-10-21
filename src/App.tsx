import MyRequestsPage, { SelfServiceLayout } from "./pages/MyRequestsPage";
import CalendarConnectionsPage from "./pages/CalendarConnectionsPage";
import CalendarOAuthCallbackPage from "./pages/CalendarOAuthCallbackPage";
import PayrollReconciliationPage from "./pages/PayrollReconciliationPage";
import PayrollPoliciesPage from "./pages/PayrollPoliciesPage";
import HrLetterTemplatesPage from "./pages/HrLetterTemplatesPage";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./store";

import LoginPage from "./pages/auth/LoginPage";
import ActivateAccountPage from "./pages/auth/ActivateAccountPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import RoleDashboard from "./pages/RoleDashboard";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

import ResourcePage from "./pages/ResourcePage";
import ReportsPage from "./pages/ReportsPage";
import SalaryPage from "./pages/SalaryPage";
import PayslipSelfServicePage from "./pages/PayslipSelfServicePage";
import PayrollManagementPage from "./pages/PayrollManagementPage";
import TimesheetPage from "./pages/TimesheetPage";
import LeavePage from "./pages/LeavePage";
import AttendancePage from "./pages/AttendancePage";
import ProjectPage from "./pages/ProjectPage";
import MentorshipPage from "./pages/MentorshipPage";
import PerformancePage from "./pages/PerformancePage";
import WfhPage from "./pages/WfhPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import WorkingHoursPage from "./pages/WorkingHoursPage";
import MyProfilePage from "./pages/MyProfilePage";

import EmployeeManagementPage from "./pages/EmployeeManagementPage";
import DepartmentManagementPage from "./pages/DepartmentManagementPage";
import EmployeeHierarchyPage from "./pages/EmployeeHierarchyPage";
import LeaveConfigurationPage from "./pages/LeaveConfigurationPage";
import SecuritySessionsPage from "./pages/SecuritySessionsPage";

import DocumentsPage from "./pages/DocumentsPage";
import DocumentManagementPage from "./pages/DocumentManagementPage";

import AnnouncementsPage from "./pages/AnnouncementsPage";
import AnnouncementManagementPage from "./pages/AnnouncementManagementPage";

import PoliciesPage from "./pages/PoliciesPage";
import PolicyManagementPage from "./pages/PolicyManagementPage";

import TrainingPage from "./pages/TrainingPage";
import TrainingManagementPage from "./pages/TrainingManagementPage";

import RecruitmentPage from "./pages/RecruitmentPage";
import ExpensePage from "./pages/ExpensePage";
import TravelPage from "./pages/TravelPage";
import AssetManagementPage from "./pages/AssetManagementPage";
import SupportTicketPage from "./pages/SupportTicketPage";
import BenefitsPage from "./pages/BenefitsPage";
import LoanAdvancePage from "./pages/LoanAdvancePage";
import WorkforceSchedulingPage from "./pages/WorkforceSchedulingPage";
import SeparationPage from "./pages/SeparationPage";
import GrievancePage from "./pages/GrievancePage";
import RecognitionPage from "./pages/RecognitionPage";
import SurveyPage from "./pages/SurveyPage";
import CareerMovementPage from "./pages/CareerMovementPage";
import ProbationReviewPage from "./pages/ProbationReviewPage";
import AttendanceRegularizationPage from "./pages/AttendanceRegularizationPage";
import LetterRequestPage from "./pages/LetterRequestPage";
import OvertimePage from "./pages/OvertimePage";
import ReferralPage from "./pages/ReferralPage";
import DataChangeRequestPage from "./pages/DataChangeRequestPage";
import EmergencyContactsPage from "./pages/EmergencyContactsPage";
import ComplianceRecordsPage from "./pages/ComplianceRecordsPage";
import ProfileCompletionPage from "./pages/ProfileCompletionPage";
import PayrollChangeRequestPage from "./pages/PayrollChangeRequestPage";
import HolidayCalendarPage from "./pages/HolidayCalendarPage";
import TaxDeclarationPage from "./pages/TaxDeclarationPage";
import ShiftSwapPage from "./pages/ShiftSwapPage";
import EmployeeMilestonesPage from "./pages/EmployeeMilestonesPage";
import EmployeeSkillsPage from "./pages/EmployeeSkillsPage";
import EmployeeSuggestionsPage from "./pages/EmployeeSuggestionsPage";
import PolicyAcknowledgementPage from "./pages/PolicyAcknowledgementPage";
import HrServiceRequestPage from "./pages/HrServiceRequestPage";
import EmployeeAvailabilityPage from "./pages/EmployeeAvailabilityPage";
import ManagerOneOnOnePage from "./pages/ManagerOneOnOnePage";
import Employee360FeedbackPage from "./pages/Employee360FeedbackPage";
import PrivacyConsentPage from "./pages/PrivacyConsentPage";
import BeneficiaryPage from "./pages/BeneficiaryPage";
import EmploymentContractPage from "./pages/EmploymentContractPage";
import AccessCardRequestPage from "./pages/AccessCardRequestPage";
import EmployeeTransferPage from "./pages/EmployeeTransferPage";
import LeaveEncashmentPage from "./pages/LeaveEncashmentPage";
import EmployeeAssetRequestPage from "./pages/EmployeeAssetRequestPage";
import ShiftPreferencePage from "./pages/ShiftPreferencePage";
import TransportRequestPage from "./pages/TransportRequestPage";
import LeaveDonationPage from "./pages/LeaveDonationPage";
import InternalMobilityPage from "./pages/InternalMobilityPage";
import FlexibleWorkRequestPage from "./pages/FlexibleWorkRequestPage";
import TalentSuccessionPage from "./pages/TalentSuccessionPage";
import MySuccessionPlanPage from "./pages/MySuccessionPlanPage";
import WorkplaceIncidentPage from "./pages/WorkplaceIncidentPage";
import ApprovalInboxPage from "./pages/ApprovalInboxPage";
import HRCalendarPage from "./pages/HRCalendarPage";
import ActivityAuditPage from "./pages/ActivityAuditPage";
import ActivityLogsPage from "./pages/ActivityLogsPage";
import LoginLocationMonitorPage from "./pages/LoginLocationMonitorPage";
import BlueThinkChatPage from "./pages/BlueThinkChatPage";
import TeamChatPage from "./pages/TeamChatPage";
import DailyStandupPage from "./pages/DailyStandupPage";

import EmployeeLifecyclePage from "./pages/EmployeeLifecyclePage";
import WorkforceAnalyticsPage from "./pages/WorkforceAnalyticsPage";
import CompensationAnalyticsPage from "./pages/CompensationAnalyticsPage";
import DocumentExpiryDashboardPage from "./pages/DocumentExpiryDashboardPage";
import EmployeeDataQualityPage from "./pages/EmployeeDataQualityPage";
import TrainingCompliancePage from "./pages/TrainingCompliancePage";
import LearningEffectivenessPage from "./pages/LearningEffectivenessPage";
import HrCaseSlaDashboardPage from "./pages/HrCaseSlaDashboardPage";
import AttendanceLeaveRiskPage from "./pages/AttendanceLeaveRiskPage";
import EmployeeCostAnalyticsPage from "./pages/EmployeeCostAnalyticsPage";

/**
 * Supported application roles.
 */
const roles = [
  "ADMIN",
  "HR",
  "MANAGER",
  "EMPLOYEE",
] as const;

/**
 * Creates all routes for a specific role.
 */
function roleRoutes(role: string) {
  const b = `/${role.toLowerCase()}`;

  const admin = role === "ADMIN";
  const hr = role === "HR";
  const manager = role === "MANAGER";

  return (
    <Route
      key={role}
      element={<ProtectedRoute roles={[role as any]} />}
    >
      <Route element={<AppLayout />}>

        {!admin && <Route path={`${b}/my-requests`} element={<SelfServiceLayout />}>
          <Route index element={<MyRequestsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="wfh" element={<WfhPage />} />
          <Route path="attendance-regularization" element={<AttendanceRegularizationPage />} />
          <Route path="timesheets" element={<TimesheetPage />} />
          <Route path="overtime" element={<OvertimePage />} />
          <Route path="shift-swaps" element={<ShiftSwapPage />} />
          <Route path="shift-preferences" element={<ShiftPreferencePage />} />
          <Route path="flexible-work-requests" element={<FlexibleWorkRequestPage />} />
          <Route path="leave-encashments" element={<LeaveEncashmentPage />} />
          <Route path="leave-donations" element={<LeaveDonationPage />} />
          <Route path="expenses" element={<ExpensePage />} />
          <Route path="travel" element={<TravelPage />} />
          <Route path="loans" element={<LoanAdvancePage />} />
          <Route path="benefits" element={<BenefitsPage />} />
          <Route path="payroll-change-requests" element={<PayrollChangeRequestPage />} />
          <Route path="tax-declarations" element={<TaxDeclarationPage />} />
          <Route path="letters" element={<LetterRequestPage />} />
          <Route path="data-change-requests" element={<DataChangeRequestPage />} />
          <Route path="emergency-contacts" element={<EmergencyContactsPage />} />
          <Route path="beneficiaries" element={<BeneficiaryPage />} />
          <Route path="policy-acknowledgements" element={<PolicyAcknowledgementPage />} />
          <Route path="asset-requests" element={<EmployeeAssetRequestPage />} />
          <Route path="transport-requests" element={<TransportRequestPage />} />
          <Route path="access-card-requests" element={<AccessCardRequestPage />} />
          <Route path="hr-service-requests" element={<HrServiceRequestPage />} />
          <Route path="support" element={<SupportTicketPage />} />
          <Route path="grievances" element={<GrievancePage />} />
          <Route path="workplace-incidents" element={<WorkplaceIncidentPage />} />
          <Route path="career-movements" element={<CareerMovementPage />} />
          <Route path="internal-mobility" element={<InternalMobilityPage />} />
          <Route path="employee-transfers" element={<EmployeeTransferPage />} />
          <Route path="referrals" element={<ReferralPage />} />
          <Route path="employee-suggestions" element={<EmployeeSuggestionsPage />} />
          <Route path="separation" element={<SeparationPage />} />
        </Route>}
        {admin && <Route path={`${b}/staff-approvals`} element={<MyRequestsPage review />} />}

        <Route path={`${b}/calendar-connections`} element={<CalendarConnectionsPage />} />
        {(admin || hr) && <><Route path={`${b}/payroll-reconciliation`} element={<PayrollReconciliationPage />} /><Route path={`${b}/payroll-policies`} element={<PayrollPoliciesPage />} /><Route path={`${b}/letter-templates`} element={<HrLetterTemplatesPage />} /></>}

        {/* =====================================================
            COMMON DASHBOARD
        ====================================================== */}

        <Route
          path={`${b}/dashboard`}
          element={<RoleDashboard />}
        />

        <Route
          path={`${b}/employee-lifecycle`}
          element={<EmployeeLifecyclePage />}
        />

        {/* =====================================================
            ADMIN / HR
        ====================================================== */}

        {(admin || hr) && (
          <>
            <Route
              path={`${b}/employees`}
              element={<EmployeeManagementPage />}
            />

            <Route
              path={`${b}/departments`}
              element={<DepartmentManagementPage />}
            />
          </>
        )}

        {/* =====================================================
            ADMIN ONLY
        ====================================================== */}

        {admin && (
          <>
            <Route
              path={`${b}/employee-hierarchy`}
              element={<EmployeeHierarchyPage />}
            />

            <Route
              path={`${b}/leave/configuration`}
              element={<LeaveConfigurationPage />}
            />
          </>
        )}

        {/* =====================================================
            MANAGER
        ====================================================== */}

        {manager && (
          <Route
            path={`${b}/team`}
            element={
              <ResourcePage
                resource="team"
                title="My Team"
              />
            }
          />
        )}

        {/* =====================================================
            COMMON MODULES
        ====================================================== */}

        <Route
          path={`${b}/attendance`}
          element={<AttendancePage />}
        />

        <Route
          path={`${b}/leave`}
          element={<LeavePage />}
        />

        <Route
          path={`${b}/timesheets`}
          element={<TimesheetPage />}
        />

        <Route
          path={`${b}/timesheets/all`}
          element={<TimesheetPage adminAll />}
        />

        <Route
          path={`${b}/projects`}
          element={<ProjectPage />}
        />

        <Route
          path={`${b}/mentorships`}
          element={<MentorshipPage />}
        />

        <Route
          path={`${b}/performance`}
          element={<PerformancePage />}
        />

        <Route
          path={`${b}/salary`}
          element={<SalaryPage />}
        />

        <Route
          path={`${b}/payslips`}
          element={<PayslipSelfServicePage />}
        />

        {/* =====================================================
            TALENT / APPROVAL / AUDIT
        ====================================================== */}

        {(admin || hr || manager) && (
          <Route
            path={`${b}/talent-succession`}
            element={<TalentSuccessionPage />}
          />
        )}

        {role === "EMPLOYEE" && (
          <Route
            path={`${b}/my-succession-plan`}
            element={<MySuccessionPlanPage />}
          />
        )}

        {(admin || hr || manager) && (
          <Route
            path={`${b}/approval-inbox`}
            element={<ApprovalInboxPage />}
          />
        )}

        <Route
          path={`${b}/activity-audit`}
          element={<ActivityLogsPage />}
        />

        <Route
          path={`${b}/hr-calendar`}
          element={<HRCalendarPage />}
        />

        <Route
          path={`${b}/wfh`}
          element={<WfhPage />}
        />

        {/* =====================================================
            PROFILE / SYSTEM
        ====================================================== */}

        <Route
          path={`${b}/profile`}
          element={<MyProfilePage />}
        />

        <Route
          path={`${b}/notifications`}
          element={<NotificationsPage />}
        />

        <Route path={`${b}/team-chat`} element={<TeamChatPage />} />

        <Route path={`${b}/daily-standup`} element={<DailyStandupPage />} />

        <Route
          path={`${b}/settings`}
          element={<SettingsPage />}
        />

        <Route
          path={`${b}/working-hours`}
          element={<WorkingHoursPage />}
        />

        <Route
          path={`${b}/security`}
          element={<SecuritySessionsPage />}
        />

        <Route
          path={`${b}/login-locations`}
          element={<LoginLocationMonitorPage />}
        />

        {/* =====================================================
            DOCUMENTS
        ====================================================== */}

        <Route
          path={`${b}/documents`}
          element={
            admin || hr
              ? <DocumentManagementPage />
              : <DocumentsPage />
          }
        />

        {/* =====================================================
            ANNOUNCEMENTS
        ====================================================== */}

        <Route
          path={`${b}/announcements`}
          element={
            admin || hr
              ? <AnnouncementManagementPage />
              : <AnnouncementsPage />
          }
        />

        {/* =====================================================
            POLICIES
        ====================================================== */}

        <Route
          path={`${b}/policies`}
          element={
            admin || hr
              ? <PolicyManagementPage />
              : <PoliciesPage />
          }
        />

        {/* =====================================================
            TRAINING
        ====================================================== */}

        <Route
          path={`${b}/training`}
          element={
            admin || hr
              ? <TrainingManagementPage />
              : <TrainingPage />
          }
        />

        {/* =====================================================
            OTHER COMMON MODULES
        ====================================================== */}

        <Route
          path={`${b}/recruitment`}
          element={<RecruitmentPage />}
        />

        <Route
          path={`${b}/expenses`}
          element={<ExpensePage />}
        />

        <Route
          path={`${b}/travel`}
          element={<TravelPage />}
        />

        <Route
          path={`${b}/assets`}
          element={<AssetManagementPage />}
        />

        <Route
          path={`${b}/support`}
          element={<SupportTicketPage />}
        />

        <Route
          path={`${b}/benefits`}
          element={<BenefitsPage />}
        />

        <Route
          path={`${b}/loans`}
          element={<LoanAdvancePage />}
        />

        <Route
          path={`${b}/workforce`}
          element={<WorkforceSchedulingPage />}
        />

        <Route
          path={`${b}/separation`}
          element={<SeparationPage />}
        />

        <Route
          path={`${b}/grievances`}
          element={<GrievancePage />}
        />

        <Route
          path={`${b}/recognition`}
          element={<RecognitionPage />}
        />

        <Route
          path={`${b}/surveys`}
          element={<SurveyPage />}
        />

        <Route
          path={`${b}/career-movements`}
          element={<CareerMovementPage />}
        />

        <Route
          path={`${b}/probation`}
          element={<ProbationReviewPage />}
        />

        <Route
          path={`${b}/attendance-regularization`}
          element={<AttendanceRegularizationPage />}
        />

        <Route
          path={`${b}/letters`}
          element={<LetterRequestPage />}
        />

        <Route
          path={`${b}/overtime`}
          element={<OvertimePage />}
        />

        <Route
          path={`${b}/referrals`}
          element={<ReferralPage />}
        />

        <Route
          path={`${b}/data-change-requests`}
          element={<DataChangeRequestPage />}
        />

        <Route
          path={`${b}/emergency-contacts`}
          element={<EmergencyContactsPage />}
        />

        <Route
          path={`${b}/compliance-records`}
          element={<ComplianceRecordsPage />}
        />

        <Route
          path={`${b}/profile-completion`}
          element={<ProfileCompletionPage />}
        />

        <Route
          path={`${b}/payroll-change-requests`}
          element={<PayrollChangeRequestPage />}
        />

        <Route
          path={`${b}/holidays`}
          element={<HolidayCalendarPage />}
        />

        <Route
          path={`${b}/tax-declarations`}
          element={<TaxDeclarationPage />}
        />

        <Route
          path={`${b}/shift-swaps`}
          element={<ShiftSwapPage />}
        />

        <Route
          path={`${b}/employee-milestones`}
          element={<EmployeeMilestonesPage />}
        />

        <Route
          path={`${b}/employee-skills`}
          element={<EmployeeSkillsPage />}
        />

        <Route
          path={`${b}/employee-suggestions`}
          element={<EmployeeSuggestionsPage />}
        />

        <Route
          path={`${b}/policy-acknowledgements`}
          element={<PolicyAcknowledgementPage />}
        />

        <Route
          path={`${b}/hr-service-requests`}
          element={<HrServiceRequestPage />}
        />

        <Route
          path={`${b}/employee-availability`}
          element={<EmployeeAvailabilityPage />}
        />

        <Route
          path={`${b}/manager-one-on-ones`}
          element={<ManagerOneOnOnePage />}
        />

        <Route
          path={`${b}/employee-360-feedback`}
          element={<Employee360FeedbackPage />}
        />

        <Route
          path={`${b}/privacy-consents`}
          element={<PrivacyConsentPage />}
        />

        <Route
          path={`${b}/beneficiaries`}
          element={<BeneficiaryPage />}
        />

        <Route
          path={`${b}/employment-contracts`}
          element={<EmploymentContractPage />}
        />

        <Route
          path={`${b}/access-card-requests`}
          element={<AccessCardRequestPage />}
        />

        <Route
          path={`${b}/employee-transfers`}
          element={<EmployeeTransferPage />}
        />

        <Route
          path={`${b}/leave-encashments`}
          element={<LeaveEncashmentPage />}
        />

        <Route
          path={`${b}/asset-requests`}
          element={<EmployeeAssetRequestPage />}
        />

        <Route
          path={`${b}/shift-preferences`}
          element={<ShiftPreferencePage />}
        />

        <Route
          path={`${b}/transport-requests`}
          element={<TransportRequestPage />}
        />

        <Route
          path={`${b}/leave-donations`}
          element={<LeaveDonationPage />}
        />

        <Route
          path={`${b}/internal-mobility`}
          element={<InternalMobilityPage />}
        />

        <Route
          path={`${b}/flexible-work-requests`}
          element={<FlexibleWorkRequestPage />}
        />

        <Route
          path={`${b}/workplace-incidents`}
          element={<WorkplaceIncidentPage />}
        />

        {/* =====================================================
            ADMIN / HR ANALYTICS
        ====================================================== */}

        <Route
          path={`${b}/ai-assistant`}
          element={<BlueThinkChatPage />}
        />

        {(admin || hr) && (
          <>
            <Route
              path={`${b}/workforce-analytics`}
              element={<WorkforceAnalyticsPage />}
            />

            <Route
              path={`${b}/compensation-analytics`}
              element={<CompensationAnalyticsPage />}
            />

            <Route
              path={`${b}/document-expiry-dashboard`}
              element={<DocumentExpiryDashboardPage />}
            />

            <Route
              path={`${b}/employee-data-quality`}
              element={<EmployeeDataQualityPage />}
            />

            <Route
              path={`${b}/training-compliance`}
              element={<TrainingCompliancePage />}
            />

            <Route
              path={`${b}/learning-effectiveness`}
              element={<LearningEffectivenessPage />}
            />

            <Route
              path={`${b}/hr-case-sla`}
              element={<HrCaseSlaDashboardPage />}
            />

            <Route
              path={`${b}/attendance-leave-risk`}
              element={<AttendanceLeaveRiskPage />}
            />

            <Route
              path={`${b}/employee-cost-analytics`}
              element={<EmployeeCostAnalyticsPage />}
            />

            <Route
              path={`${b}/reports/:type`}
              element={<ReportsPage />}
            />

            {/* =================================================
                PAYROLL MANAGEMENT — HR ONLY
            ================================================== */}

            {hr && (
              <>
                <Route
                  path={`${b}/salary/structures`}
                  element={<PayrollManagementPage mode="structures" />}
                />

                <Route
                  path={`${b}/salary/generate`}
                  element={<PayrollManagementPage mode="generate" />}
                />
              </>
            )}
          </>
        )}

      </Route>
    </Route>
  );
}

/**
 * Main application component.
 */
export default function App() {
  const session = useSelector(
    (s: RootState) => s.auth.session
  );

  const defaultPath = session?.role
    ? `/${session.role.toLowerCase()}/dashboard`
    : "/login";

  return (
    <Routes>
      <Route path="/calendar/oauth/callback/:provider" element={<CalendarOAuthCallbackPage />} />

      {/* =====================================================
          LOGIN
      ====================================================== */}

      <Route path="/activate-account" element={<ActivateAccountPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* =====================================================
          ROLE ROUTES
      ====================================================== */}

      {roles.map(roleRoutes)}

      {/* =====================================================
          ROOT REDIRECT
      ====================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to={defaultPath}
            replace
          />
        }
      />

      {/* =====================================================
          404 REDIRECT
      ====================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to={defaultPath}
            replace
          />
        }
      />

    </Routes>
  );
}