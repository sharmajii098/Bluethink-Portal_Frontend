import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
} from "@mui/material";
import {
  AccountBalanceRounded,
  BadgeRounded,
  BusinessCenterRounded,
  CameraAltRounded,
  DeleteOutlineRounded,
  DescriptionRounded,
  DownloadRounded,
  EditRounded,
  EmailRounded,
  FamilyRestroomRounded,
  HomeRounded,
  PersonRounded,
  PhoneRounded,
  SchoolRounded,
  UploadFileRounded,
} from "@mui/icons-material";
import { api } from "../services/api";

const TABS = [
  "Overview",
  "Personal & Contact",
  "Address",
  "Family",
  "Education",
  "Previous Employment",
  "Bank Details",
  "Documents",
] as const;
type Tab = (typeof TABS)[number];
type Row = Record<string, any>;
type Doc = { id:number; category:string; originalFilename:string; fileSize:number; status:string; uploadedAt:string; reviewComment?:string; };

const REQUIRED_DOCUMENTS = [
  ["AADHAAR_CARD", "Aadhaar Card", true],
  ["PAN_CARD", "PAN Card", true],
  ["ADDRESS_PROOF", "Address Proof", true],
  ["BANK_PROOF", "Cancelled Cheque / Bank Proof", true],
  ["EDUCATION_CERTIFICATE", "Highest Education Certificate", true],
  ["PREVIOUS_EMPLOYMENT_OFFER", "Previous Company Offer Letter", false],
  ["PREVIOUS_EMPLOYMENT_SALARY_SLIP", "Previous Company Salary Slip", false],
  ["EXPERIENCE_LETTER", "Experience / Relieving Letter", false],
] as const;

const emptyEducation = { level:"", institution:"", boardUniversity:"", courseStream:"", startDate:"", endDate:"", passingYear:"", score:"" };
const emptyEmployment = { companyName:"", designation:"", employmentType:"Full Time", location:"", startDate:"", endDate:"", lastDrawnSalary:"", reasonForLeaving:"" };
const emptyFamily = { fullName:"", relationship:"", dob:"", phoneNumber:"", occupation:"", dependent:false, emergencyContact:false };

export default function MyProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [profile, setProfile] = useState<Row>({});
  const [form, setForm] = useState<Row>({});
  const [education, setEducation] = useState<Row[]>([]);
  const [employment, setEmployment] = useState<Row[]>([]);
  const [family, setFamily] = useState<Row[]>([]);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{type:"education"|"employment"|"family"; data:Row}|null>(null);
  const [docFile, setDocFile] = useState<File|null>(null);
  const [docCategory, setDocCategory] = useState("AADHAAR_CARD");
  const [docBusy, setDocBusy] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [p,e,x,f,d] = await Promise.all([
        api.get("/profile/me"),
        api.get("/profile/me/education"),
        api.get("/profile/me/employment-history"),
        api.get("/profile/me/family"),
        api.get("/documents/my"),
      ]);
      setProfile(p.data || {}); setForm(p.data || {});
      setEducation(e.data || []); setEmployment(x.data || []); setFamily(f.data || []); setDocuments(d.data || []);
      await loadPhoto(Boolean(p.data?.photoAvailable));
    } catch (e:any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to load your profile.");
    } finally { setLoading(false); }
  };

  const loadPhoto = async (available = true) => {
    if (!available) { setPhotoUrl(""); return; }
    try {
      const response = await api.get("/profile/me/photo", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      setPhotoUrl(old => { if (old) URL.revokeObjectURL(old); return url; });
    } catch { setPhotoUrl(""); }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  const saveProfile = async () => {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await api.put("/profile/me", form);
      setProfile(response.data || form); setForm(response.data || form);
      setMessage("Profile details saved successfully.");
      window.dispatchEvent(new Event("hrms-profile-updated"));
    } catch (e:any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to save profile.");
    } finally { setSaving(false); }
  };

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setSaving(true); setError("");
    try {
      const data = new FormData(); data.append("file", file);
      await api.post("/profile/me/photo", data, { headers: { "Content-Type":"multipart/form-data" } });
      await loadPhoto(true); setProfile((p:any)=>({...p,photoAvailable:true}));
      setMessage("Profile image updated."); window.dispatchEvent(new Event("hrms-profile-updated"));
    } catch (e:any) { setError(e?.response?.data?.message || "Unable to upload profile image."); }
    finally { setSaving(false); event.target.value=""; }
  };

  const completion = useMemo(() => {
    const profileKeys = ["fullName","email","phoneNumber","dob","gender","currentAddress","permanentAddress","bankName","accountNumber","ifscCode"];
    let complete = profileKeys.filter(k => String(profile[k] ?? "").trim()).length;
    let total = profileKeys.length + 4;
    if (photoUrl) complete++;
    if (family.length) complete++;
    if (education.length) complete++;
    if (documents.some(d=>d.category==="AADHAAR_CARD") && documents.some(d=>d.category==="PAN_CARD")) complete++;
    return Math.round((complete/total)*100);
  }, [profile, photoUrl, family, education, documents]);

  const upsertRecord = async () => {
    if (!editor) return;
    setSaving(true); setError("");
    try {
      const typePath = editor.type === "employment" ? "employment-history" : editor.type;
      const hasId = Boolean(editor.data.id);
      await api.request({ method: hasId ? "put" : "post", url: `/profile/me/${typePath}${hasId ? `/${editor.data.id}` : ""}`, data: editor.data });
      setEditor(null); await load(); setMessage("Record saved successfully.");
    } catch (e:any) { setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to save record."); }
    finally { setSaving(false); }
  };

  const deleteRecord = async (type:"education"|"employment"|"family", id:number) => {
    if (!window.confirm("Delete this record?")) return;
    const typePath = type === "employment" ? "employment-history" : type;
    try { await api.delete(`/profile/me/${typePath}/${id}`); await load(); }
    catch (e:any) { setError(e?.response?.data?.message || "Unable to delete record."); }
  };

  const uploadDocument = async () => {
    if (!docFile) { setError("Please select a document file."); return; }
    setDocBusy(true); setError("");
    try {
      const data = new FormData(); data.append("file", docFile); data.append("category", docCategory);
      await api.post("/documents", data, { headers:{"Content-Type":"multipart/form-data"} });
      setDocFile(null); await load(); setMessage("Document uploaded for HR verification.");
    } catch (e:any) { setError(e?.response?.data?.message || "Document upload failed."); }
    finally { setDocBusy(false); }
  };

  const downloadDoc = async (doc:Doc) => {
    try {
      const r = await api.get(`/documents/${doc.id}/download`, { responseType:"blob" });
      const url = URL.createObjectURL(r.data); const a=document.createElement("a"); a.href=url; a.download=doc.originalFilename; a.click(); URL.revokeObjectURL(url);
    } catch { setError("Unable to download document."); }
  };

  if (loading) return <div className="th-loading"><CircularProgress size={24}/> Loading employee profile...</div>;

  return <div className="profile-v6">
    <div className="th-page-header profile-v6-heading">
      <div><h1>My Employee Profile</h1><div className="th-breadcrumb">Account <span>›</span> Complete employee record</div></div>
      <div className="profile-v6-completion"><span>Profile completion</span><strong>{completion}%</strong><LinearProgress variant="determinate" value={completion}/></div>
    </div>

    {error && <Alert severity="error" sx={{mb:2}} onClose={()=>setError("")}>{error}</Alert>}
    {message && <Alert severity="success" sx={{mb:2}} onClose={()=>setMessage("")}>{message}</Alert>}

    <section className="profile-v6-hero th-card">
      <div className="profile-v6-avatar-wrap">
        <Avatar src={photoUrl || undefined} className="profile-v6-avatar">{String(profile.fullName || profile.userId || "U").slice(0,1)}</Avatar>
        <label className="profile-v6-photo-button" title="Upload profile image"><CameraAltRounded/><input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPhoto}/></label>
      </div>
      <div className="profile-v6-identity">
        <h2>{profile.fullName || "Employee name"}</h2>
        <p>{profile.designation || "Designation not assigned"} <span>•</span> {profile.department || "Department not assigned"}</p>
        <div className="profile-v6-tags"><span><BadgeRounded/>{profile.userId}</span><span>{profile.role}</span><span className="active">{profile.status || "ACTIVE"}</span></div>
      </div>
      <div className="profile-v6-contact-mini"><div><EmailRounded/><span><small>Official email</small><b>{profile.email || "—"}</b></span></div><div><PhoneRounded/><span><small>Phone</small><b>{profile.phoneNumber || "—"}</b></span></div></div>
    </section>

    <div className="profile-v6-tabs">{TABS.map(tab=><button key={tab} className={tab===activeTab?"active":""} onClick={()=>setActiveTab(tab)}>{tab}</button>)}</div>

    {activeTab === "Overview" && <Overview profile={profile} education={education} employment={employment} family={family} documents={documents} completion={completion} onTab={setActiveTab}/>} 
    {activeTab === "Personal & Contact" && <ProfileFields title="Personal & Communication Details" icon={<PersonRounded/>} description="Your official and personal contact information." fields={[
      ["fullName","Full Name"],["email","Official Email"],["personalEmail","Personal Email"],["phoneNumber","Mobile Number"],["alternatePhoneNumber","Alternate Phone"],["panNumber","PAN Number"],["dob","Date of Birth","date"],["gender","Gender"],["bloodGroup","Blood Group"],["maritalStatus","Marital Status"]
    ]} form={form} setForm={setForm} onSave={saveProfile} saving={saving}/>} 
    {activeTab === "Address" && <ProfileFields title="Current & Permanent Address" icon={<HomeRounded/>} description="Keep both addresses updated for HR, payroll and official communication." fields={[
      ["currentAddress","Current Address"],["currentCity","Current City"],["currentState","Current State"],["currentPincode","Current PIN Code"],
      ["permanentAddress","Permanent Address"],["permanentCity","Permanent City"],["permanentState","Permanent State"],["permanentPincode","Permanent PIN Code"]
    ]} form={form} setForm={setForm} onSave={saveProfile} saving={saving}/>} 
    {activeTab === "Bank Details" && <ProfileFields title="Bank & Salary Account Details" icon={<AccountBalanceRounded/>} description="These details are used for salary processing. Verify carefully before saving." fields={[
      ["accountHolderName","Account Holder Name"],["bankName","Bank Name"],["bankBranch","Branch"],["bankAccountType","Account Type"],["accountNumber","Account Number"],["ifscCode","IFSC Code"]
    ]} form={form} setForm={setForm} onSave={saveProfile} saving={saving}/>} 

    {activeTab === "Education" && <RecordSection title="Education Details" subtitle="Add High School, Intermediate, Graduation, Post Graduation or other qualifications." icon={<SchoolRounded/>} rows={education} empty="No education details added yet." onAdd={()=>setEditor({type:"education",data:{...emptyEducation}})} render={(r)=><><div><strong>{r.level || "Qualification"}</strong><span>{r.institution || "Institution"}</span><small>{[r.courseStream,r.boardUniversity,r.passingYear,r.score].filter(Boolean).join(" · ")}</small></div><div className="profile-v6-row-actions"><Button size="small" startIcon={<EditRounded/>} onClick={()=>setEditor({type:"education",data:{...r}})}>Edit</Button><Button size="small" color="error" onClick={()=>deleteRecord("education",r.id)}><DeleteOutlineRounded/></Button></div></>}/>} 

    {activeTab === "Previous Employment" && <RecordSection title="Previous Employment" subtitle="Store previous company, employment period, role and last drawn salary." icon={<BusinessCenterRounded/>} rows={employment} empty="No previous employment history added." onAdd={()=>setEditor({type:"employment",data:{...emptyEmployment}})} render={(r)=><><div><strong>{r.companyName}</strong><span>{r.designation || "—"}{r.employmentType?` · ${r.employmentType}`:""}</span><small>{dateRange(r.startDate,r.endDate)}{r.lastDrawnSalary?` · Last salary ₹${Number(r.lastDrawnSalary).toLocaleString("en-IN")}`:""}</small></div><div className="profile-v6-row-actions"><Button size="small" startIcon={<EditRounded/>} onClick={()=>setEditor({type:"employment",data:{...r}})}>Edit</Button><Button size="small" color="error" onClick={()=>deleteRecord("employment",r.id)}><DeleteOutlineRounded/></Button></div></>}/>} 

    {activeTab === "Family" && <RecordSection title="Family Details" subtitle="Maintain family members, dependants and emergency-contact information." icon={<FamilyRestroomRounded/>} rows={family} empty="No family details added yet." onAdd={()=>setEditor({type:"family",data:{...emptyFamily}})} render={(r)=><><div><strong>{r.fullName}</strong><span>{r.relationship || "—"}</span><small>{[r.phoneNumber,r.occupation,r.dependent?"Dependent":null,r.emergencyContact?"Emergency contact":null].filter(Boolean).join(" · ")}</small></div><div className="profile-v6-row-actions"><Button size="small" startIcon={<EditRounded/>} onClick={()=>setEditor({type:"family",data:{...r}})}>Edit</Button><Button size="small" color="error" onClick={()=>deleteRecord("family",r.id)}><DeleteOutlineRounded/></Button></div></>}/>} 

    {activeTab === "Documents" && <DocumentsSection documents={documents} category={docCategory} setCategory={setDocCategory} file={docFile} setFile={setDocFile} busy={docBusy} upload={uploadDocument} download={downloadDoc}/>} 

    <RecordEditor editor={editor} setEditor={setEditor} saving={saving} save={upsertRecord} documents={documents}/>
  </div>;
}

function Overview({profile,education,employment,family,documents,completion,onTab}:{profile:Row;education:Row[];employment:Row[];family:Row[];documents:Doc[];completion:number;onTab:(t:Tab)=>void}) {
  const requiredCount = REQUIRED_DOCUMENTS.filter(x=>x[2]).length;
  const uploadedRequired = REQUIRED_DOCUMENTS.filter(x=>x[2] && documents.some(d=>d.category===x[0])).length;
  const cards = [
    ["Personal profile", completion>=70?"Good":"Needs attention", `${completion}% complete`, "Personal & Contact", <PersonRounded/>],
    ["Education", education.length?"Added":"Missing", `${education.length} qualification(s)`, "Education", <SchoolRounded/>],
    ["Previous employment", employment.length?"Added":"Not added", `${employment.length} employer(s)`, "Previous Employment", <BusinessCenterRounded/>],
    ["Family", family.length?"Added":"Not added", `${family.length} member(s)`, "Family", <FamilyRestroomRounded/>],
    ["Required documents", uploadedRequired===requiredCount?"Complete":"Pending", `${uploadedRequired}/${requiredCount} mandatory`, "Documents", <DescriptionRounded/>],
    ["Bank details", profile.bankName&&profile.accountNumber&&profile.ifscCode?"Added":"Incomplete", profile.bankName || "Salary account not complete", "Bank Details", <AccountBalanceRounded/>],
  ] as const;
  return <div className="profile-v6-overview-grid">{cards.map(([title,status,desc,tab,icon])=><button className="th-card profile-v6-overview-card" key={title} onClick={()=>onTab(tab as Tab)}><span className="profile-v6-overview-icon">{icon}</span><div><small>{title}</small><strong>{status}</strong><p>{desc}</p></div></button>)}</div>;
}

function ProfileFields({title,icon,description,fields,form,setForm,onSave,saving}:{title:string;icon:any;description:string;fields:any[];form:Row;setForm:(x:Row)=>void;onSave:()=>void;saving:boolean}) {
  return <section className="th-card profile-v6-section"><div className="profile-v6-section-head"><span>{icon}</span><div><h3>{title}</h3><p>{description}</p></div></div><div className="profile-v6-form-grid">{fields.map(([key,label,type])=><label key={key}><span>{label}</span><input type={type||"text"} value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div><div className="profile-v6-section-actions"><Button variant="contained" disabled={saving} onClick={onSave}>{saving?<CircularProgress size={18}/>:"Save Changes"}</Button></div></section>;
}

function RecordSection({title,subtitle,icon,rows,empty,onAdd,render}:{title:string;subtitle:string;icon:any;rows:Row[];empty:string;onAdd:()=>void;render:(r:Row)=>any}) {
  return <section className="th-card profile-v6-section"><div className="profile-v6-section-head"><span>{icon}</span><div><h3>{title}</h3><p>{subtitle}</p></div><Button variant="contained" onClick={onAdd}>+ Add Record</Button></div><div className="profile-v6-record-list">{rows.length?rows.map(r=><div className="profile-v6-record-row" key={r.id}>{render(r)}</div>):<div className="profile-v6-empty">{empty}</div>}</div></section>;
}

function DocumentsSection({documents,category,setCategory,file,setFile,busy,upload,download}:{documents:Doc[];category:string;setCategory:(x:string)=>void;file:File|null;setFile:(x:File|null)=>void;busy:boolean;upload:()=>void;download:(d:Doc)=>void}) {
  return <div className="profile-v6-doc-layout"><section className="th-card profile-v6-section"><div className="profile-v6-section-head"><span><DescriptionRounded/></span><div><h3>Required Employee Documents</h3><p>Aadhaar, PAN, address, bank and qualification records are maintained here.</p></div></div><div className="profile-v6-doc-checklist">{REQUIRED_DOCUMENTS.map(([key,label,required])=>{const doc=documents.find(d=>d.category===key);return <div key={key}><span className={doc?"complete":"pending"}>{doc?"✓":"!"}</span><div><strong>{label}</strong><small>{required?"Required":"Required when applicable"}</small></div><b className={`status ${(doc?.status||"MISSING").toLowerCase()}`}>{doc?.status||"MISSING"}</b></div>})}</div></section>
  <section className="th-card profile-v6-section"><div className="profile-v6-section-head"><span><UploadFileRounded/></span><div><h3>Upload Document</h3><p>PDF, JPG, PNG, DOC or DOCX up to 10 MB.</p></div></div><div className="profile-v6-doc-upload"><label><span>Document Type</span><select value={category} onChange={e=>setCategory(e.target.value)}>{REQUIRED_DOCUMENTS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label><label><span>Choose File</span><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><Button variant="contained" disabled={busy||!file} onClick={upload} startIcon={!busy?<UploadFileRounded/>:undefined}>{busy?<CircularProgress size={18}/>:"Upload for Verification"}</Button></div></section>
  <section className="th-card profile-v6-section profile-v6-doc-register"><div className="profile-v6-section-head"><span><DescriptionRounded/></span><div><h3>My Uploaded Documents</h3><p>{documents.length} file(s) in your document register.</p></div></div><div className="profile-v6-record-list">{documents.length?documents.map(d=><div className="profile-v6-record-row" key={d.id}><div><strong>{d.originalFilename}</strong><span>{humanize(d.category)}</span><small>{Math.round((d.fileSize||0)/1024)} KB {d.reviewComment?` · ${d.reviewComment}`:""}</small></div><div className="profile-v6-row-actions"><span className={`status ${d.status.toLowerCase()}`}>{d.status}</span><Button size="small" startIcon={<DownloadRounded/>} onClick={()=>download(d)}>Download</Button></div></div>):<div className="profile-v6-empty">No documents uploaded yet.</div>}</div></section></div>;
}

function RecordEditor({editor,setEditor,saving,save,documents}:{editor:{type:"education"|"employment"|"family";data:Row}|null;setEditor:(x:any)=>void;saving:boolean;save:()=>void;documents:Doc[]}) {
  if (!editor) return null;
  const data=editor.data; const change=(k:string,v:any)=>setEditor({...editor,data:{...data,[k]:v}});
  return <Dialog open fullWidth maxWidth="md" onClose={()=>setEditor(null)}><DialogTitle>{data.id?"Edit":"Add"} {editor.type==="employment"?"Previous Employment":humanize(editor.type)}</DialogTitle><DialogContent><div className="profile-v6-form-grid dialog-grid">
    {editor.type==="education"&&<><Field label="Education Level" value={data.level} onChange={v=>change("level",v)} options={["High School / 10th","Intermediate / 12th","Diploma","Graduation","Post Graduation","Doctorate","Other"]}/><Field label="School / College / Institution" value={data.institution} onChange={v=>change("institution",v)}/><Field label="Board / University" value={data.boardUniversity} onChange={v=>change("boardUniversity",v)}/><Field label="Course / Stream" value={data.courseStream} onChange={v=>change("courseStream",v)}/><Field label="Start Date" type="date" value={data.startDate} onChange={v=>change("startDate",v)}/><Field label="End Date" type="date" value={data.endDate} onChange={v=>change("endDate",v)}/><Field label="Passing Year" value={data.passingYear} onChange={v=>change("passingYear",v)}/><Field label="Percentage / CGPA" value={data.score} onChange={v=>change("score",v)}/><DocumentField label="Certificate / Marksheet" value={data.certificateDocumentId} documents={documents.filter(d=>d.category==="EDUCATION_CERTIFICATE")} onChange={v=>change("certificateDocumentId",v)}/></>}
    {editor.type==="employment"&&<><Field label="Company Name" value={data.companyName} onChange={v=>change("companyName",v)}/><Field label="Role / Designation" value={data.designation} onChange={v=>change("designation",v)}/><Field label="Employment Type" value={data.employmentType} onChange={v=>change("employmentType",v)} options={["Full Time","Part Time","Contract","Internship","Consultant"]}/><Field label="Location" value={data.location} onChange={v=>change("location",v)}/><Field label="Start Date" type="date" value={data.startDate} onChange={v=>change("startDate",v)}/><Field label="End Date" type="date" value={data.endDate} onChange={v=>change("endDate",v)}/><Field label="Last Drawn Monthly Salary" type="number" value={data.lastDrawnSalary} onChange={v=>change("lastDrawnSalary",v)}/><Field label="Reason for Leaving" value={data.reasonForLeaving} onChange={v=>change("reasonForLeaving",v)}/><DocumentField label="Offer Letter" value={data.offerLetterDocumentId} documents={documents.filter(d=>d.category==="PREVIOUS_EMPLOYMENT_OFFER")} onChange={v=>change("offerLetterDocumentId",v)}/><DocumentField label="Salary Slip" value={data.salarySlipDocumentId} documents={documents.filter(d=>d.category==="PREVIOUS_EMPLOYMENT_SALARY_SLIP")} onChange={v=>change("salarySlipDocumentId",v)}/><DocumentField label="Experience / Relieving Letter" value={data.experienceLetterDocumentId} documents={documents.filter(d=>d.category==="EXPERIENCE_LETTER")} onChange={v=>change("experienceLetterDocumentId",v)}/></>}
    {editor.type==="family"&&<><Field label="Full Name" value={data.fullName} onChange={v=>change("fullName",v)}/><Field label="Relationship" value={data.relationship} onChange={v=>change("relationship",v)} options={["Father","Mother","Spouse","Son","Daughter","Brother","Sister","Guardian","Other"]}/><Field label="Date of Birth" type="date" value={data.dob} onChange={v=>change("dob",v)}/><Field label="Phone Number" value={data.phoneNumber} onChange={v=>change("phoneNumber",v)}/><Field label="Occupation" value={data.occupation} onChange={v=>change("occupation",v)}/><label className="profile-v6-checkbox"><input type="checkbox" checked={Boolean(data.dependent)} onChange={e=>change("dependent",e.target.checked)}/><span>Dependent family member</span></label><label className="profile-v6-checkbox"><input type="checkbox" checked={Boolean(data.emergencyContact)} onChange={e=>change("emergencyContact",e.target.checked)}/><span>Emergency contact</span></label></>}
  </div></DialogContent><DialogActions><Button onClick={()=>setEditor(null)}>Cancel</Button><Button variant="contained" disabled={saving} onClick={save}>{saving?<CircularProgress size={18}/>:"Save Record"}</Button></DialogActions></Dialog>;
}

function Field({label,value,onChange,type="text",options}:{label:string;value:any;onChange:(v:any)=>void;type?:string;options?:string[]}) { return <label><span>{label}</span>{options?<select value={value??""} onChange={e=>onChange(e.target.value)}><option value="">Select</option>{options.map(x=><option key={x}>{x}</option>)}</select>:<input type={type} value={value??""} onChange={e=>onChange(e.target.value)}/>}</label>; }
function DocumentField({label,value,documents,onChange}:{label:string;value:any;documents:Doc[];onChange:(v:any)=>void}) { return <label><span>{label}</span><select value={value??""} onChange={e=>onChange(e.target.value?Number(e.target.value):null)}><option value="">Not attached</option>{documents.map(d=><option key={d.id} value={d.id}>{d.originalFilename} ({d.status})</option>)}</select><small className="profile-v6-field-help">Upload the file in Documents first, then attach it here.</small></label>; }
function humanize(value:string){return value.replaceAll("_"," ").replace(/\b\w/g,x=>x.toUpperCase());}
function dateRange(start?:string,end?:string){return [start||"Start date",end||"Present"].join(" – ");}
