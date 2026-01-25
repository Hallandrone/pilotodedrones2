import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mail, Phone, MessageCircle, Calendar, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Contact {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  message: string | null;
  contacted_at: string | null;
  status: string | null;
}

interface CompanyContactsProps {
  userId?: string;
}

export function CompanyContacts({ userId }: CompanyContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadContacts();
    }
  }, [userId]);

  const loadContacts = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('profile_contacts')
        .select('*')
        .eq('profile_id', userId)
        .order('contacted_at', { ascending: false });

      if (error) throw error;

      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los contactos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('profile_contacts')
        .update({ status: 'read' })
        .eq('id', contactId);

      if (error) throw error;

      setContacts(contacts.map(c =>
        c.id === contactId ? { ...c, status: 'read' } : c
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unreadCount = contacts.filter(c => c.status !== 'read').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00b3f3] mb-4"></div>
          <p className="text-white/60">Cargando contactos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-[#00b3f3]" />
          Contactos Recibidos
          {unreadCount > 0 && (
            <Badge className="bg-[#FF69B4] text-white animate-pulse">
              {unreadCount} nuevo{unreadCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </h1>
        <p className="text-white/60">Mensajes de clientes interesados en tus servicios</p>
      </div>

      {/* Search */}
      <Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <Card className="bg-white/10 backdrop-blur-xl border-2 border-[#00b3f3]/30">
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">
              {searchTerm ? 'No se encontraron contactos' : 'Aún no has recibido contactos'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredContacts.map((contact, index) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card
                className={`bg-white/10 backdrop-blur-xl border-2 ${contact.status === 'read' ? 'border-white/10' : 'border-[#FF69B4]/50'} hover:border-[#00b3f3]/50 transition-all duration-200 cursor-pointer`}
                onClick={() => contact.status !== 'read' && markAsRead(contact.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        {contact.contact_name}
                        {contact.status !== 'read' && (
                          <Badge className="bg-[#FF69B4] text-white text-xs animate-pulse">Nuevo</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-white/60 mt-1 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {contact.contacted_at && new Date(contact.contacted_at).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-[#00b3f3]" />
                    <a
                      href={`mailto:${contact.contact_email}`}
                      className="text-[#00b3f3] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact.contact_email}
                    </a>
                  </div>
                  {contact.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-[#00b3f3]" />
                      <a
                        href={`tel:${contact.contact_phone}`}
                        className="text-[#00b3f3] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {contact.contact_phone}
                      </a>
                    </div>
                  )}
                  {contact.message && (
                    <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-sm text-white/80 leading-relaxed">
                        <MessageCircle className="h-4 w-4 inline mr-2 text-[#00b3f3]" />
                        {contact.message}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
