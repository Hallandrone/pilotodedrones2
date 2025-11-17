import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit, Plus, Image, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Banner {
  id: string;
  position: string;
  imageUrl: string;
  redirectUrl: string;
  active: boolean;
  title: string;
}

export function BannerConfiguration() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [newBanner, setNewBanner] = useState({
    position: "",
    imageUrl: "",
    redirectUrl: "",
    active: true,
    title: ""
  });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_banners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setBanners(data.map(banner => ({
        id: banner.id,
        title: banner.title,
        position: banner.position,
        imageUrl: banner.image_url,
        redirectUrl: banner.redirect_url || '',
        active: banner.active
      })));
    } catch (error) {
      console.error('Error loading banners:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los banners",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('ad-banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ad-banners')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleCreateBanner = async () => {
    if (!newBanner.title || !newBanner.position) {
      toast({
        title: "Error",
        description: "Complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    if (!imageFile) {
      toast({
        title: "Error",
        description: "Por favor seleccione una imagen",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      // Upload image
      const imageUrl = await uploadImage(imageFile);
      if (!imageUrl) throw new Error('Failed to upload image');

      // Insert banner into database
      const { error } = await supabase
        .from('ad_banners')
        .insert({
          title: newBanner.title,
          position: newBanner.position,
          image_url: imageUrl,
          redirect_url: newBanner.redirectUrl || null,
          active: newBanner.active
        });

      if (error) throw error;

      await loadBanners();
      setNewBanner({ position: "", imageUrl: "", redirectUrl: "", active: true, title: "" });
      setImageFile(null);
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Banner creado",
        description: "El banner ha sido creado exitosamente",
      });
    } catch (error) {
      console.error('Error creating banner:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el banner",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleBannerStatus = async (id: string) => {
    const banner = banners.find(b => b.id === id);
    if (!banner) return;

    try {
      const { error } = await supabase
        .from('ad_banners')
        .update({ active: !banner.active })
        .eq('id', id);

      if (error) throw error;
      await loadBanners();
      
      toast({
        title: "Estado actualizado",
        description: `El banner ha sido ${!banner.active ? 'activado' : 'desactivado'}`,
      });
    } catch (error) {
      console.error('Error updating banner:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el banner",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (banner: Banner) => {
    setEditingBanner(banner);
    setIsEditDialogOpen(true);
  };

  const handleUpdateBanner = async () => {
    if (!editingBanner) return;

    setUploading(true);
    
    try {
      let imageUrl = editingBanner.imageUrl;

      // If a new image was selected, upload it
      if (imageFile) {
        const newImageUrl = await uploadImage(imageFile);
        if (!newImageUrl) throw new Error('Failed to upload image');
        imageUrl = newImageUrl;
      }

      // Update banner in database
      const { error } = await supabase
        .from('ad_banners')
        .update({
          title: editingBanner.title,
          position: editingBanner.position,
          image_url: imageUrl,
          redirect_url: editingBanner.redirectUrl || null,
          active: editingBanner.active
        })
        .eq('id', editingBanner.id);

      if (error) throw error;

      await loadBanners();
      setImageFile(null);
      setEditingBanner(null);
      setIsEditDialogOpen(false);
      
      toast({
        title: "Banner actualizado",
        description: "El banner ha sido actualizado exitosamente",
      });
    } catch (error) {
      console.error('Error updating banner:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el banner",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteBanner = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ad_banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadBanners();
      
      toast({
        title: "Banner eliminado",
        description: "El banner ha sido eliminado exitosamente",
      });
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el banner",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          Configuración de Banners
        </CardTitle>
        <CardDescription>
          Gestiona los banners publicitarios de la página principal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Banners Registrados</h3>
            <p className="text-sm text-muted-foreground">
              Administra los banners que aparecen en la landing page
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Banner</DialogTitle>
                <DialogDescription>
                  Complete la información del nuevo banner publicitario
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título del Banner</Label>
                  <Input
                    id="title"
                    value={newBanner.title}
                    onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                    placeholder="Ej: Banner Principal"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Posición</Label>
                  <Input
                    id="position"
                    value={newBanner.position}
                    onChange={(e) => setNewBanner({ ...newBanner, position: e.target.value })}
                    placeholder="Ej: Superior, Medio, Inferior"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="imageFile">Imagen del Banner</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="imageFile"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="flex-1"
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recomendado: imagen rectangular tipo portada (1200x300px)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="redirectUrl">URL de Redirección</Label>
                  <Input
                    id="redirectUrl"
                    value={newBanner.redirectUrl}
                    onChange={(e) => setNewBanner({ ...newBanner, redirectUrl: e.target.value })}
                    placeholder="https://ejemplo.com"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={newBanner.active}
                    onCheckedChange={(checked) => setNewBanner({ ...newBanner, active: checked })}
                  />
                  <Label htmlFor="active">Banner activo</Label>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateBanner} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={uploading}
                >
                  {uploading ? "Subiendo..." : "Crear Banner"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay banners registrados</p>
            <p className="text-sm text-muted-foreground mt-2">Crea tu primer banner publicitario</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vista Previa</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Posición</TableHead>
                  <TableHead>URL Redirección</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <img 
                        src={banner.imageUrl} 
                        alt={banner.title}
                        className="h-12 w-24 object-cover rounded border"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{banner.title}</TableCell>
                    <TableCell>{banner.position}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {banner.redirectUrl ? (
                        <a 
                          href={banner.redirectUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {banner.redirectUrl}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={banner.active ? "default" : "secondary"} className={banner.active ? "bg-green-600" : ""}>
                        {banner.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleBannerStatus(banner.id)}
                          className={banner.active ? "text-gray-600" : "text-green-600"}
                        >
                          {banner.active ? "Desactivar" : "Activar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(banner)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBanner(banner.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Banner Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Banner</DialogTitle>
              <DialogDescription>
                Modifica la información del banner publicitario
              </DialogDescription>
            </DialogHeader>
            {editingBanner && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-title">Título del Banner</Label>
                  <Input
                    id="edit-title"
                    value={editingBanner.title}
                    onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                    placeholder="Ej: Banner Principal"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-position">Posición</Label>
                  <Input
                    id="edit-position"
                    value={editingBanner.position}
                    onChange={(e) => setEditingBanner({ ...editingBanner, position: e.target.value })}
                    placeholder="Ej: Superior, Medio, Inferior"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Imagen Actual</Label>
                  <img 
                    src={editingBanner.imageUrl} 
                    alt={editingBanner.title}
                    className="w-full h-24 object-cover rounded border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-imageFile">Nueva Imagen (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-imageFile"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="flex-1"
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recomendado: imagen rectangular tipo portada (1200x300px)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-redirectUrl">URL de Redirección</Label>
                  <Input
                    id="edit-redirectUrl"
                    value={editingBanner.redirectUrl}
                    onChange={(e) => setEditingBanner({ ...editingBanner, redirectUrl: e.target.value })}
                    placeholder="https://ejemplo.com"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-active"
                    checked={editingBanner.active}
                    onCheckedChange={(checked) => setEditingBanner({ ...editingBanner, active: checked })}
                  />
                  <Label htmlFor="edit-active">Banner activo</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingBanner(null);
                  setImageFile(null);
                }}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdateBanner} 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={uploading}
              >
                {uploading ? "Actualizando..." : "Actualizar Banner"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}