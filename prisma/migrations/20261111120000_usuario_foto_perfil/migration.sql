-- Renombra la columna sin perder datos: guarda el nombre del archivo en el almacenamiento,
-- no una URL. Escrita a mano porque Prisma generaría DROP + ADD COLUMN.
BEGIN TRY

BEGIN TRAN;

EXEC sp_rename 'dbo.Usuario.fotoPerfilURL', 'fotoPerfil', 'COLUMN';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
