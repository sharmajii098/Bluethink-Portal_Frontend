import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import { api } from "../services/api";
import { getPlaceName } from "../services/reverseGeocoding";

type LocationRow = {
  id: number;
  employeeId: string;
  employeeName?: string;
  latitude: number;
  longitude: number;
  distanceFromOffice: number;
  workMode: string;
  loginStatus: string;
  loginTime: string;
};

const fmt = (value?: string) => value ? new Date(value).toLocaleString() : "—";

export default function LoginLocationMonitorPage() {
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [places, setPlaces] = useState<Record<number, string>>({});

  useEffect(() => {
    api.get<LocationRow[]>("/login-locations/visible")
      .then(response => setRows(response.data || []))
      .catch(e => setError(e?.response?.data?.message || "Unable to load login locations."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    rows.forEach(row => {
      getPlaceName(row.latitude, row.longitude)
        .then(place => {
          if (active) setPlaces(current => ({ ...current, [row.id]: place }));
        })
        .catch(() => {
          if (active) setPlaces(current => ({ ...current, [row.id]: "Place unavailable" }));
        });
    });
    return () => { active = false; };
  }, [rows]);

  return (
    <Box>
      <Typography variant="h4" fontWeight={800}>Login Location Monitor</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Work mode is detected automatically from GPS at successful login. HR/Admin can view organization-wide records; managers can view their teams.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : (
        <Stack spacing={2}>
          {rows.map(row => (
            <Card key={row.id}>
              <CardContent>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      <LocationOnRoundedIcon sx={{ verticalAlign: "middle", mr: 0.5 }} />
                      {row.employeeName || row.employeeId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{row.employeeId}</Typography>
                    <Typography color="text.secondary">{fmt(row.loginTime)}</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Coordinates: {row.latitude.toFixed(6)}, {row.longitude.toFixed(6)}
                      <Box component="span" sx={{ color: "text.secondary" }}>
                        {" · "}{places[row.id] || "Looking up place…"}
                      </Box>
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={row.workMode} />
                    <Chip
                      label={`${Math.round(row.distanceFromOffice)} m from office`}
                      color={row.distanceFromOffice <= 200 ? "success" : "error"}
                    />
                    <Chip label={row.loginStatus} color="success" />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {!rows.length && <Typography color="text.secondary">No login-location records found.</Typography>}
        </Stack>
      )}
    </Box>
  );
}
