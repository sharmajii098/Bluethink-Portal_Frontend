import { Stack, Typography, Pagination } from "@mui/material";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
};

export default function PaginationBar({ page, pageSize, total, onChange }: Props) {
  const count = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between" gap={1.5} sx={{ mt: 2, px: 1, pb: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </Typography>
      <Pagination page={Math.min(page, count)} count={count} onChange={(_, value) => onChange(value)} color="primary" shape="rounded" showFirstButton showLastButton />
    </Stack>
  );
}
