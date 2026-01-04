export function TaxonomyForm({ formFields, formData, setFormData }) {
  return (
    <>
      {formFields.map((field) => (
        <TextField
          variant="filled"
          key={field.name}
          label={field.label}
          value={formData[field.name] || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              [field.name]: e.target.value,
            })
          }
          fullWidth
          sx={{ mb: 2 }}
        />
      ))}
    </>
  );
}
