// Etiquetas legibles de la actividad. Archivo sin dependencias de servidor (db),
// para poder importarlo desde componentes cliente.

export const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Inició sesión",
  LOGOUT: "Cerró sesión",
  ORDER_STATUS: "Cambió el estado de un pedido",
  MENU_CATEGORY_CREATE: "Creó una categoría",
  MENU_ITEM_CREATE: "Creó un plato",
  MENU_ITEM_UPDATE: "Editó un plato",
  MENU_ITEM_DELETE: "Eliminó un plato",
  TABLE_CREATE: "Creó una mesa",
  TABLE_UPDATE: "Editó una mesa",
  TABLE_DELETE: "Eliminó una mesa",
  RESTAURANT_CREATE: "Creó un restorán",
  ACCESS_CREATE: "Creó un acceso de personal",
  ACCESS_DELETE: "Eliminó un acceso de personal",
  OPERATIONS_CONFIG: "Cambió el flujo operativo",
  WAITLIST_CALL: "Llamó a un grupo en espera",
  WAITLIST_SEAT: "Sentó a un grupo de la espera",
  WAITLIST_CANCEL: "Quitó a un grupo de la espera",
  WAITLIST_TOGGLE: "Activó/desactivó la lista de espera",
  RESTAURANT_APPROVE: "Aprobó la apertura de un negocio",
  MEMBERSHIP_APPROVE: "Aprobó una membresía",
  ACCESS_PAUSE: "Pausó un acceso de personal",
  ACCESS_RESUME: "Reactivó un acceso de personal",
  ACCESS_EDIT: "Editó un acceso de personal",
  // Acceso de soporte (superadmin entra a la cuenta/panel del cliente)
  ADMIN_ACCESS: "Acceso de soporte",
  IMPERSONATE: "Acceso de soporte",
  // Cuenta / organización / membresía
  CLIENT_CREATE: "Creó un cliente",
  CLIENT_UPGRADE: "Promovió el cliente a A",
  CLIENT_TOGGLE: "Activó/suspendió la cuenta",
  ORG_CREATE: "Creó una organización",
  MEMBERSHIP_CHANGE: "Cambió el plan/membresía",
  MEMBERSHIP_EXTEND: "Extendió la membresía",
  MEMBERSHIP_CANCEL: "Canceló la membresía",
  MEMBERSHIP_REQUEST: "Solicitó una membresía",
  PLAN_CANCEL: "Canceló el plan",
  PAYMENT_CONFIG: "Configuró el cobro online (MercadoPago)",
  // Socios / invitaciones
  PARTNER_ADD: "Agregó un socio",
  PARTNER_REMOVE: "Quitó un socio",
  INVITE_SENT: "Envió una invitación de socio",
  INVITE_ACCEPTED: "Aceptó una invitación de socio",
  // Mesa
  TABLE_CONFIRM: "Confirmó la mesa",
  TABLE_CLOSE: "Cerró la mesa",
};

export const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL: "Personal",
  PEDIDOS: "Pedidos",
  MENU: "Menú",
  MESAS: "Mesas",
  CUENTA: "Cuenta",
};
