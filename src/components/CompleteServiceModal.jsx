import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControlLabel, Checkbox } from "@mui/material";

// nota: la firma y el file upload se implementan aparte (librería de firma + input file)
const CompleteServiceModal = ({ open, servicio, onClose, onSubmit }) => {
  const [responsable, setResponsable] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [notificar, setNotificar] = useState(false);
  // firma / soporte -> implementar uploader y firma pad
  const handleSubmit = () => {
    const payload = {
      fecha_completado: new Date().toISOString().slice(0,10),
      atendido_por: /* current user id from auth context */ 1,
      responsable,
      observaciones,
      notificar_al_cliente: notificar,
    };
    onSubmit(servicio.id, payload);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Completar servicio #{servicio.numero_servicio || servicio.id}</DialogTitle>
      <DialogContent>
        <TextField fullWidth label="Responsable" value={responsable} onChange={(e)=>setResponsable(e.target.value)} sx={{mb:2}} />
        <TextField fullWidth label="Observaciones" value={observaciones} onChange={(e)=>setObservaciones(e.target.value)} multiline rows={4} sx={{mb:2}} />
        <FormControlLabel control={<Checkbox checked={notificar} onChange={(e)=>setNotificar(e.target.checked)}/>} label="Notificar al cliente" />
        {/* Placeholder para firma y soporte */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit}>Completar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompleteServiceModal;
