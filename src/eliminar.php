Estos son algunos de los archivos mas importantes de un aplicativo que me encuentro desarrollando. Los archivos adjuntos dan una idea muy clara de lo que el aplicativo intenta, sin embargo, describiré el funcionamiento que se espera y posteriormente los errores que presenta, a fin de que me ayudes a identificar, diagnosticar y ofrecer alternativas de solución. Quiero que analices profundamente estos archivos, y que como el mejor ingeniero de sistemas y desarrollador de software, te hagas profundamente conocedor de en su lógica, y en cuanto requieras alguna otra información o archivo sé claro el pedirlo. Intentaré que tengas el mejor contexto posible.

Entonces, el aplicativo tiene como fin obtener datos de los servicios prestados por una compañía de lubricantes cuyos principales clientes son astilleros. La lógica del negocio nos llevó a construir el proyecto así:

Stack Tecnológico:
- Frontend -> React Vite
- UI -> MUI
- Backend -> Drupal
- Base de Datos -> MySQL MaríaDB


Arquitectura:

Entidades (Taxonomías en drupal):
- Clasificaciones:
Campos (nombre)
- Empaques:
Campos (nombre)
- Fabricantes de Lubricantes:
Campos (nombre)
- lob:
Campos (nombre)
- Prestadores de Servicios:
Campos (nombre)
- Tipos de Lubricantes:
Campos (nombre)
- Tipos de servicios:
Campos (nombre)

Entidades (Tipos de contenido en drupal):
- Lubricantes:
Campos (
clasificación: texto,
código: numero entero,
descripción: texto,
empaque: texto,
especificaciones: texto,
fabricante: texto,
familia: texto,
galones/empaque: número decimal,
imagen del lubricante: imagen,
lob: texto,
origen: texto,
tipo de lubricante: texto
)

- Clientes:
Campos (
activos: referencia a entidad tipo paragraph,
email de contacto: correo electrónico,
enviar notificaciones: booleano,
logo del cliente: imagen,
numero de contacto: número de teléfono,
prestador de servicio: texto
)

- Componentes:
Campos (
activo: texto,
activo id: texto,
cliente: texto,
cliente id: texto,
equipo: texto,
equipo id: texto,
frecuencia de cambio: número entero,
frecuencia de muestreo: número entero,
lubricante: texto,
lubricante id: texto,
observaciones: texto,
volumen requerido: número decimal
)

- Servicios:
Campos (
activo: texto,
atendido por: referencia a entidad (Usuario),
cliente: referencia a entidad (Clientes),
componente: referencia a entidad (Componentes),
equipo: texto,
estado: lista de texto: pendiente, notificado, agendado, completado,
fecha agendado: fecha,
fecha completado: fecha,
fecha notificado: fecha,
fecha próximo servicio: fecha,
fecha último servicio: fecha,
firma del responsable: imagen,
informe de servicio notificar al cliente: archivo,
observaciones: texto,
responsable: texto,
soporte: imagen,
trabajo real: número entero
)

Teniendo esta información te explico el funcionamiento deseado:
- Drupal expone los endpoints que consume react en el front.
- En react se tiene una página de login
- Al hacer login se llega a una especia de página home que contiene un menú lateral con los módulos interiores del aplicativo: Configuración, Lubricantes, Clientes, Componentes, Reportes.

Módulo Configuración:
En esta parte se podrá hacer configraciones básicas del aplicativo. Crear usuarios, permisos y perfiles (Aún sin desarrollar), y gestionar "listas".
Las listas se trata de los Terminos de taxonomía en drupal descritos anteriormente, la vista de cada lista permite crear, editar o eliminar elementos de cada lista en específico, para ser utilizados posteriormente en la creación de otras entidades.

Módulo Lubricantes:
Permite la gestión de los lubricantes, crear, editar, eliminar lubricantes. La creación de un lubricante implica la selección de opciones creadas en la gestión de listas.

Módulo Clientes:
Permite gestionar los clientes, tener en cuenta que los clientes tiene la particularidad de tener uno o vario activos y cada activo debe tener al menos un equipo donde posteriormente se relacionará a él un componente.

Módulo componentes:
Este es el epicentro del aplicativo, la entidad protagonista, ya que relaciona todas las entidades y es el objeto de estudio. Al igual que en los otros módulos la vista permite crear, editar y eliminar componentes, pero a diferencia de los otros módulos la acción "ver" se muestra en toda la pantalla en lugar de un modal, ya que internamente se deben gestionar los servicios mediante la siguiente lógica:

Los servicios son una entidad independiente pero se crean desde el módulo "componentes", en la acción "Ver componente" en varias etapas, por ello se pueden automatizar algunos campos.

Etapa uno (en espera): inicia al hacer clic en el botón "nuevo servicio". Este botón creará por primera vez una entidad de tipo servicio, bebe mostrar un modal con un select donde el usuario podrá elegir el "tipo de servicio" además de llenar los siguientes datos de manera automática: "Número de servicio", "fecha de último servicio" con la fecha actual si es el primer servicio de ese tipo creado sino sería completado con la "fecha completado" del ultimo servicio creado de su tipo, "fecha de próximo servicio" calculando por defecto la (fecha actual + frecuencia de cambio(valor en "componente")) este valor cambiará en la próxima etapa, ("cliente", "Activo", "Equipo", Componente) se llenan con los datos que vienen del componente donde está siendo creado, y finalmente cambia el estado a "En espera". En este momento debe aparecer el nuevo registro en la tabla, y al final, en la columna de acciones del servicio creado, el botón "Recalcular".

Etapa dos (Agendado): inicia al hacer clic en el botón "recalcular" ubicado en la columna de acciones debe desplegarse un modal que permitiría al usuario completar el campo "Trabajo real", este campo el usuario ingresará un valor numérico indicando el trabajo real en horas del componente para así poder recalcular la real "fecha del próximo servicio". Al guardar y cerrar el modal el estado del servicio pasa a "Agendado" y se completará automáticamente el campo "fecha agendado" con la fecha actual. Entonces la columna que muestra la fecha de próximo servicio debe haber cambiado, y ahora el botón en la columna de acciones debe ser "Notificar".

Etapa tres (Notificado): Aunque existirá el botón "notificar" solo para fines prácticos si se requiere adelantar el proceso, realmente la notificación ocurrirá de manera automática cuando haya transcurrido no mas del 80% del tiempo calculado entre la "fecha agendado" y la fecha recalculada "fecha próximo servicio". Esta acción enviará una notificación vía correo electrónico al cliente indicando la fecha del servicio y otros datos asociados como el componente, equipo, activo, etc.., debe completarse de manera automática el campo "fecha notificado". Al cumplir esta acción (aveces automática, aveces manual) el estado del servicio cambia "Notificado", y ahora el botón en la columna de acciones debe ser "Completar"

Etapa cuatro (Completado): Esta es una etapa clave. Se activa al hacer clic en el botón "completar", este botón muestra al usuario un modal que le permitiría completar los campos: Responsable, Firma del responsable, Notificar al cliente, observaciones y soporte; los campos "Atendido por" y "fecha completado" se completan de manera automática. Al cerrar el modal entonces en la tabla debe cambiar el estado a completado y en la tabla mostrar ahora toda la fila del componente en tono inactivo. La columna de acciones debe contener dos botones "Ver" que permitirá ver una ficha del servicio completado, y otra "informe" que permitira al usuario (usuario interno de la compañia, no cliente) subir un archivo de informe del servicio.

Método:
Se ha desarrollado el front end así:
Componentes:
GenericTaxonomyTable: Es el componente principal del aplicativo,representa el crud completo de cualquier entidad, se utiliza tanto en listas como en las entidades fundamentales (lubricantes, clientes, componentes). Este componente consta de un título, un boton para mostrar/ocultar filtros, un boton para agregar un nuevo registro, una sección de filtros con un botón para limpiar los filtros; una sección de resultados que no es mas que una tabla que muestra los registros y dispone de una columna de acciones (casi siempre "ver, editar, eliminar") y un boton exportar. Este componente utiliza otros de manera interna como Custom Modal, GenericMultiSelect, etc. Este componente es algo complejo pues soporta multiples funcionalidades y es clave en el funcionamiento del apolicativo. 