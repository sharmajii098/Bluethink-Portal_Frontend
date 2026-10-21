import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { api } from "../services/api";

type Policy = {
  id?: number;
  title: string;
  description: string;
  category: string;
  documentPath: string;
  effectiveDate: string;
};

const MAX_POLICY_LENGTH = 100_000;
const newPolicy = (): Policy => ({
  title: "", description: "", category: "HR", documentPath: "",
  effectiveDate: new Date().toISOString().slice(0, 10),
});

const requestError = (error: any, fallback: string): string =>
  error?.response?.data?.message || error?.response?.data?.detail || fallback;

export default function PolicyManagementPage() {
  const [rows, setRows] = useState<Policy[]>([]);
  const [form, setForm] = useState<Policy>(newPolicy);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const result = await api.get("/policies/all");
      setRows(Array.isArray(result.data) ? result.data : []);
      setError("");
    } catch (e: any) {
      setError(requestError(e, "Unable to load policies"));
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setFormError("");
    if (!form.title.trim()) { setFormError("Enter a policy title."); return; }
    if (form.description.length > MAX_POLICY_LENGTH) {
      setFormError("Policy content exceeds 100,000 characters.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) await api.put(`/policies/${form.id}`, form);
      else await api.post("/policies", form);
      setOpen(false);
      setForm(newPolicy());
      await load();
    } catch (e: any) {
      setFormError(requestError(e, "Unable to save policy. Check the database migration and try again."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this policy?")) return;
    try {
      await api.delete(`/policies/${id}`);
      await load();
    } catch (e: any) {
      setError(requestError(e, "Unable to delete policy"));
    }
  };

  const showForm = (policy?: Policy) => {
    setForm(policy ? { ...newPolicy(), ...policy } : newPolicy());
    setFormError("");
    setOpen(true);
  };

  return (
    <Box>
      <Box className="page-header">
        <div>
          <h1>Policy Management</h1>
          <p>Create and maintain company policies and compliance documents.</p>
        </div>
        <Button variant="contained" onClick={() => showForm()}>+ Add Policy</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Table>
        <TableHead><TableRow>
          <TableCell>Title</TableCell><TableCell>Category</TableCell>
          <TableCell>Effective Date</TableCell><TableCell>Actions</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {rows.map(policy => (
            <TableRow key={policy.id}>
              <TableCell>
                <Typography fontWeight={600}>{policy.title}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                  {(policy.description || "").length > 180
                    ? `${policy.description.slice(0, 180)}…`
                    : policy.description}
                </Typography>
              </TableCell>
              <TableCell>{policy.category}</TableCell>
              <TableCell>{policy.effectiveDate || "-"}</TableCell>
              <TableCell>
                <IconButton aria-label={`Edit ${policy.title}`} onClick={() => showForm(policy)}>
                  <EditRoundedIcon />
                </IconButton>
                <IconButton aria-label={`Delete ${policy.title}`} onClick={() => policy.id && remove(policy.id)}>
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{form.id ? "Edit Policy" : "Add Policy"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Title" value={form.title} required inputProps={{ maxLength: 255 }}
              onChange={e => setForm({ ...form, title: e.target.value })} />
            <TextField label="Category" value={form.category} inputProps={{ maxLength: 255 }}
              onChange={e => setForm({ ...form, category: e.target.value })} />
            <TextField label="Effective Date" type="date" InputLabelProps={{ shrink: true }}
              value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} />
            <TextField label="Document Path / Reference" value={form.documentPath} inputProps={{ maxLength: 255 }}
              onChange={e => setForm({ ...form, documentPath: e.target.value })} />
            <TextField label="Description / Policy Content" multiline minRows={7} maxRows={20}
              value={form.description} inputProps={{ maxLength: MAX_POLICY_LENGTH }}
              onChange={e => setForm({ ...form, description: e.target.value })}
              helperText={`${form.description.length.toLocaleString()} / ${MAX_POLICY_LENGTH.toLocaleString()} characters`} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" disabled={saving || !form.title.trim()} onClick={save}>
            {saving ? "Saving..." : "Save Policy"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
