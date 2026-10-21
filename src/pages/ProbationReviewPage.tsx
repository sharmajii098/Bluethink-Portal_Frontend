
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../services/api";
import { getCurrentRole } from "../utils/authRole";

type Review = {
  id: number;
  reviewNumber: string;
  employeeUserId: string;
  employeeName: string;
  joiningDate?: string;
  probationEndDate?: string;
  currentDesignation?: string;
  departmentName?: string;
  status: string;
  rating?: number;
  employeeComment?: string;
  reviewerComment?: string;
  decision?: string;
  confirmationDate?: string;
};

type ReviewForm = {
  probationEndDate?: string;
  employeeComment?: string;
  status?: string;
  decision?: string;
  rating?: number;
  comment?: string;
};

const managementRoles = new Set([
  "ADMIN",
  "HR",
  "MANAGER",
]);

export default function ProbationReviewPage() {
  const role =
    getCurrentRole();

  const [rows, setRows] = useState<Review[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] =
    useState<Review | null>(null);

  const [form, setForm] =
    useState<ReviewForm>({});

  const [error, setError] = useState("");

  const isManagement =
    managementRoles.has(role);

  const load = async (): Promise<void> => {
    try {
      setError("");

      const endpoint = isManagement
        ? "/probation-reviews"
        : "/probation-reviews/my";

      const response =
        await api.get<Review[]>(endpoint);

      setRows(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (errorObject: unknown) {
      const errorResponse =
        errorObject as {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

      setError(
        errorResponse.response?.data?.message ||
          "Unable to load probation reviews."
      );
    }
  };

  useEffect(() => {
    void load();
  }, [isManagement]);

  const submit = async (): Promise<void> => {
    try {
      setError("");

      await api.post("/probation-reviews", {
        probationEndDate:
          form.probationEndDate,
        employeeComment:
          form.employeeComment,
      });

      setOpen(false);
      setForm({});

      await load();
    } catch (errorObject: unknown) {
      const errorResponse =
        errorObject as {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

      setError(
        errorResponse.response?.data?.message ||
          "Unable to submit review."
      );
    }
  };

  const review = async (): Promise<void> => {
    if (!selected) {
      return;
    }

    try {
      setError("");

      await api.patch(
        `/probation-reviews/${selected.id}/review`,
        form
      );

      setSelected(null);
      setForm({});

      await load();
    } catch (errorObject: unknown) {
      const errorResponse =
        errorObject as {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

      setError(
        errorResponse.response?.data?.message ||
          "Unable to update review."
      );
    }
  };

  const openReview = (item: Review): void => {
    setSelected(item);

    setForm({
      status:
        item.status === "PENDING"
          ? "UNDER_REVIEW"
          : item.status,

      decision:
        item.decision || "",

      rating:
        item.rating || 5,

      comment:
        item.reviewerComment || "",
    });
  };

  const getStatusColor = (
    status: string
  ):
    | "success"
    | "error"
    | "warning"
    | "default" => {
    if (status === "CONFIRMED") {
      return "success";
    }

    if (status === "NOT_CONFIRMED") {
      return "error";
    }

    if (
      status === "EXTENDED" ||
      status === "UNDER_REVIEW" ||
      status === "PENDING"
    ) {
      return "warning";
    }

    return "default";
  };

  return (
    <Box
      sx={{
        p: {
          xs: 2,
          md: 4,
        },
      }}
    >
      {/* Header */}
      <Stack
        direction={{
          xs: "column",
          sm: "row",
        }}
        justifyContent="space-between"
        gap={2}
        mb={3}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
          >
            Probation & Confirmation
          </Typography>

          <Typography color="text.secondary">
            Track probation milestones, manager
            reviews and confirmation decisions.
          </Typography>
        </Box>

        {!isManagement && (
          <Button
            variant="contained"
            onClick={() => {
              setForm({});
              setError("");
              setOpen(true);
            }}
          >
            Start Review
          </Button>
        )}
      </Stack>

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Review List */}
      <Stack spacing={2}>
        {rows.map((item) => (
          <Paper
            key={item.id}
            sx={{
              p: 2.5,
              borderRadius: 3,
            }}
          >
            <Stack
              direction={{
                xs: "column",
                md: "row",
              }}
              justifyContent="space-between"
              gap={2}
            >
              <Box>
                <Typography fontWeight={800}>
                  {item.employeeName ||
                    "My Review"}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  {item.reviewNumber} ·{" "}
                  {item.currentDesignation ||
                    "Employee"}

                  {item.departmentName
                    ? ` · ${item.departmentName}`
                    : ""}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ mt: 1 }}
                >
                  Probation ends:{" "}
                  {item.probationEndDate || "—"}
                </Typography>

                {item.rating !== undefined && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 0.5 }}
                  >
                    Rating: {item.rating} / 5
                  </Typography>
                )}

                {item.decision && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 0.5 }}
                  >
                    Decision: {item.decision}
                  </Typography>
                )}
              </Box>

              <Stack
                direction="row"
                alignItems="center"
                gap={1}
              >
                <Chip
                  label={item.status}
                  color={getStatusColor(
                    item.status
                  )}
                />

                {isManagement && (
                  <Button
                    variant="outlined"
                    onClick={() =>
                      openReview(item)
                    }
                  >
                    Review
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        ))}

        {!rows.length && (
          <Paper
            sx={{
              p: 5,
              textAlign: "center",
            }}
          >
            <Typography color="text.secondary">
              No probation reviews found.
            </Typography>
          </Paper>
        )}
      </Stack>

      {/* Employee Start Review Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Start Probation Review
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label="Probation End Date"
              type="date"
              InputLabelProps={{
                shrink: true,
              }}
              value={
                form.probationEndDate || ""
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  probationEndDate:
                    event.target.value,
                })
              }
              fullWidth
            />

            <TextField
              label="Employee Comments"
              multiline
              minRows={4}
              value={
                form.employeeComment || ""
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  employeeComment:
                    event.target.value,
                })
              }
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setOpen(false);
              setForm({});
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() => void submit()}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Management Review Dialog */}
      <Dialog
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setForm({});
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Review {selected?.reviewNumber}
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              select
              label="Status"
              value={
                form.status ||
                "UNDER_REVIEW"
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  status:
                    event.target.value,
                })
              }
              fullWidth
            >
              {[
                "UNDER_REVIEW",
                "CONFIRMED",
                "EXTENDED",
                "NOT_CONFIRMED",
              ].map((status) => (
                <MenuItem
                  key={status}
                  value={status}
                >
                  {status}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Rating"
              type="number"
              value={form.rating || 5}
              onChange={(event) =>
                setForm({
                  ...form,
                  rating: Number(
                    event.target.value
                  ),
                })
              }
              fullWidth
            >
              {[1, 2, 3, 4, 5].map(
                (rating) => (
                  <MenuItem
                    key={rating}
                    value={rating}
                  >
                    {rating} / 5
                  </MenuItem>
                )
              )}
            </TextField>

            <TextField
              label="Decision"
              value={form.decision || ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  decision:
                    event.target.value,
                })
              }
              fullWidth
            />

            <TextField
              label="Reviewer Comment"
              multiline
              minRows={4}
              value={form.comment || ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  comment:
                    event.target.value,
                })
              }
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setSelected(null);
              setForm({});
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() => void review()}
          >
            Save Decision
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

