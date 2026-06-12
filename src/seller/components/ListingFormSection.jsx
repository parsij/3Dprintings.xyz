import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function ListingFormSection({ title, description, children, className = "" }) {
  return (
    <Card component="section" className={className} sx={{ boxShadow: "0 14px 36px rgba(17,24,39,0.08)" }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
        {title ? (
          <>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Typography variant="h6" component="h3">
                {title}
              </Typography>
              {description ? (
                <Typography color="text.secondary" fontSize={14}>
                  {description}
                </Typography>
              ) : null}
            </Stack>
            <Divider sx={{ mb: 2 }} />
          </>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
