export type IssueDetails = {
  city?: string;
  area?: string;
  landmark?: string;
  ward?: string;
  issueType: string;
  sinceWhen?: string;
  description: string;
  previousComplaint?: { platform?: string; id?: string; date?: string } | null;
  evidence?: string[];
  name?: string;
  email?: string;
  phone?: string;
  anonymous?: boolean;
};

export type Classification = {
  authority: string;
  department: string;
  notes?: string;
};

const deptMap: Record<string, string> = {
  Garbage: "Solid Waste Management",
  "Garbage Collection": "Solid Waste Management",
  "Illegal Dumping": "Solid Waste Management",
  Roads: "Roads and Bridges",
  "Road Damage": "Roads and Bridges",
  Pothole: "Roads and Bridges",
  "Street Light": "Electrical / Street Lighting",
  Water: "Water Supply",
  "Water Leakage": "Water Supply",
  Drainage: "Drainage / Sewerage",
  "Drainage Block": "Drainage / Sewerage",
  "Sewage Overflow": "Drainage / Sewerage",
  Parks: "Garden / Parks",
  "Park Maintenance": "Garden / Parks",
  Pollution: "Health / Pollution Control",
  "Noise Pollution": "Health / Pollution Control",
  "Air Pollution": "Health / Pollution Control",
  Encroachment: "Building Permission / Estate",
  "Illegal Construction": "Building Permission / Estate",
  Default: "Administration",
};

export function classify(details: IssueDetails): Classification {
  const t = (details.issueType || "").toLowerCase();
  let key = "Default";
  if (t.includes("garbage") || t.includes("dump")) key = "Garbage Collection";
  else if (t.includes("pothole") || t.includes("road")) key = "Road Damage";
  else if (t.includes("street") && t.includes("light")) key = "Street Light";
  else if (t.includes("water") && (t.includes("leak") || t.includes("supply"))) key = "Water Leakage";
  else if (t.includes("drain") || t.includes("sewage") || t.includes("flood")) key = "Drainage Block";
  else if (t.includes("park") || t.includes("garden")) key = "Park Maintenance";
  else if (t.includes("pollution") || t.includes("smoke") || t.includes("noise")) key = "Noise Pollution";
  else if (t.includes("encroach") || t.includes("illegal")) key = "Illegal Construction";
  const department = deptMap[key] || deptMap.Default;
  const authority = "Municipal Corporation / Nagar Palika";
  return { authority, department };
}

export function buildLocationLine(details: IssueDetails): string {
  const parts = [details.landmark, details.area, details.city, details.ward ? "Ward " + details.ward : undefined].filter(Boolean) as string[];
  return parts.join(", ");
}

export function guidanceSteps(details: IssueDetails, cls: Classification): string[] {
  const steps: string[] = [];
  steps.push("Collect clear photos/videos of the issue.");
  steps.push("Note exact location with landmark, area, and city.");
  steps.push("Submit a complaint to the " + cls.department + " of the " + cls.authority + " via portal/app or ward office.");
  steps.push("Save the complaint ID and acknowledgement.");
  steps.push("If no action within a reasonable time, follow up and escalate as needed.");
  return steps;
}

export function complaintSubject(details: IssueDetails): string {
  const loc = buildLocationLine(details);
  return "Complaint regarding " + details.issueType + " at " + (loc || "[Location]");
}

export function complaintBody(details: IssueDetails, cls: Classification): string {
  const today = new Date().toLocaleDateString("en-IN");
  const loc = buildLocationLine(details) || "[Location]";
  const since = details.sinceWhen || "[Since when]";
  const prev = details.previousComplaint && details.previousComplaint.id ? ("Previous complaint reference: " + details.previousComplaint.id + " dated " + (details.previousComplaint.date || "[date]") + ".") : "";
  const evidence = details.evidence && details.evidence.length ? ("Evidence: " + details.evidence.join(", ") + ".") : "";
  const name = details.anonymous ? "Anonymous Citizen" : (details.name || "[Your Name]");
  const contact = (details.email || details.phone) ? ("Contact: " + [details.email, details.phone].filter(Boolean).join(" / ")) : "";
  return [
    "Date: " + today,
    "To,",
    "The Ward Officer / Concerned Officer,",
    cls.department + ",",
    cls.authority + ".",
    "",
    "Subject: " + complaintSubject(details),
    "",
    "Respected Sir/Madam,",
    "I wish to bring to your notice the issue of " + details.issueType + " at " + loc + ". The problem has been occurring since " + since + ".",
    details.description,
    prev,
    evidence,
    "This issue falls under " + cls.department + " of the " + cls.authority + ". I request prompt action to resolve it at the earliest.",
    "",
    "Thank you.",
    name,
    contact,
  ].filter(Boolean).join("\n");
}

export function rtiBody(details: IssueDetails, cls: Classification, complaintId?: string): string {
  const today = new Date().toLocaleDateString("en-IN");
  const loc = buildLocationLine(details) || "[Location]";
  const line2 = complaintId ? ("2. Please provide action taken report for Complaint ID: " + complaintId + ".") : "2. Please provide the complaint registration number if available.";
  return [
    "Date: " + today,
    "To,",
    "The Public Information Officer (PIO),",
    cls.department + ",",
    cls.authority + ".",
    "",
    "Subject: Application under RTI Act, 2005 regarding civic complaint",
    "",
    "Respected Sir/Madam,",
    "I am an Indian citizen and I seek the following information under the RTI Act, 2005:",
    "1. Status and action taken on complaint regarding " + details.issueType + " at " + loc + ".",
    line2,
    "3. Name and designation of the officer responsible and expected timeline for resolution.",
    "",
    "I am willing to pay the prescribed fees. Please provide the information within the statutory time period.",
    "",
    "Thank you.",
    (details.anonymous ? "Citizen" : (details.name || "[Your Name]")),
  ].join("\n");
}

export function followUpEmail(details: IssueDetails, complaintId: string): string {
  return [
    "Subject: Follow-up on Complaint ID " + complaintId,
    "",
    "Respected Sir/Madam,",
    "This is a gentle reminder regarding my complaint (ID: " + complaintId + ") concerning " + details.issueType + ". Kindly update on the current status and expected time to resolve.",
    "Thank you.",
    (details.anonymous ? "Citizen" : (details.name || "[Your Name]")),
  ].join("\n");
}

export function escalationEmail(details: IssueDetails, complaintId: string): string {
  return [
    "Subject: Escalation - No response on Complaint ID " + complaintId,
    "",
    "Respected Sir/Madam,",
    "I wish to escalate my complaint (ID: " + complaintId + ") as there has been no satisfactory response/resolution within a reasonable time. Kindly intervene and ensure prompt action.",
    "Thank you.",
    (details.anonymous ? "Citizen" : (details.name || "[Your Name]")),
  ].join("\n");
}
