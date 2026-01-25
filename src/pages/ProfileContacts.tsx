import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, MessageCircle, Calendar, Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import Logo from "@/components/ui/logo";

interface Contact {
	id: string;
	contact_name: string;
	contact_email: string;
	contact_phone: string | null;
	message: string | null;
	contacted_at: string | null;
	status: string | null;
}

const ProfileContacts = () => {
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [userType, setUserType] = useState<string | null>(null);
	const navigate = useNavigate();
	const { toast } = useToast();

	useEffect(() => {
		loadContacts();
		checkUserType();
	}, []);

	const checkUserType = async () => {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const { data: profile } = await supabase
				.from('profiles')
				.select('user_type')
				.eq('id', user.id)
				.single();

			if (profile) {
				setUserType(profile.user_type);
			}
		} catch (error) {
			console.error('Error checking user type:', error);
		}
	};

	const loadContacts = async () => {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			const { data, error } = await supabase
				.from('profile_contacts')
				.select('*')
				.eq('profile_id', user.id)
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
			<div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0] flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF69B4] mb-4"></div>
					<p className="text-[#B0B0B0]">Cargando contactos...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0]">
			{/* Header */}
			<div className="bg-[#020617]/95 backdrop-blur-xl border-b border-[#00b3f3]/30 shadow-2xl sticky top-0 z-50">
				<div className="px-4 py-4 sm:py-6">
					<div className="flex items-center gap-4 max-w-7xl mx-auto">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								const destination = userType === 'company' ? '/company' : '/pilot';
								navigate(destination);
							}}
							className="h-12 w-12 rounded-full hover:bg-[#00b3f3]/20 hover:scale-110 transition-all duration-300 text-white"
						>
							<ArrowLeft className="h-7 w-7" />
						</Button>
						<Logo
							size="xl"
							className="flex-shrink-0 [&>div]:h-14 [&>div]:w-14 sm:[&>div]:h-20 sm:[&div]:w-20 hover:scale-110 transition-all duration-300 filter drop-shadow-[0_0_15px_rgba(0,179,243,0.4)]"
							showText={false}
						/>
						<div className="flex flex-col">
							<h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">Contactos</h1>
							<p className="text-xs sm:text-lg text-[#00b3f3] font-medium uppercase tracking-wider">
								{unreadCount > 0 ? `${unreadCount} sin leer` : 'Mensajes Recibidos'}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="p-4 space-y-4 pb-20">
				{/* Search */}
				<Card className="bg-[#212121] border border-[#333333]">
					<CardContent className="p-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#B0B0B0]" />
							<Input
								placeholder="Buscar por nombre o email..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10 bg-[#2C2C2C] border-[#333333] text-[#E0E0E0]"
							/>
						</div>
					</CardContent>
				</Card>

				{/* Contacts List */}
				{filteredContacts.length === 0 ? (
					<Card className="bg-[#212121] border border-[#333333]">
						<CardContent className="p-8 text-center">
							<MessageCircle className="h-12 w-12 text-[#B0B0B0] mx-auto mb-4" />
							<p className="text-[#B0B0B0]">
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
									className={`bg-[#212121] border ${contact.status === 'read' ? 'border-[#333333]' : 'border-[#FF69B4]/50'} hover:border-[#FF69B4] transition-all duration-200`}
									onClick={() => contact.status !== 'read' && markAsRead(contact.id)}
								>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<CardTitle className="text-lg text-[#E0E0E0] flex items-center gap-2">
													{contact.contact_name}
													{contact.status !== 'read' && (
														<Badge className="bg-[#FF69B4] text-white text-xs">Nuevo</Badge>
													)}
												</CardTitle>
												<CardDescription className="text-[#B0B0B0] mt-1 flex items-center gap-2">
													<Calendar className="h-3 w-3" />
													{new Date(contact.contacted_at).toLocaleDateString('es-CL', {
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
											<Mail className="h-4 w-4 text-[#FF69B4]" />
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
												<Phone className="h-4 w-4 text-[#FF69B4]" />
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
											<div className="mt-3 p-3 bg-[#2C2C2C] rounded-lg border border-[#333333]">
												<p className="text-sm text-[#B0B0B0] leading-relaxed">
													<MessageCircle className="h-4 w-4 inline mr-2 text-[#FF69B4]" />
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
		</div>
	);
};

export default ProfileContacts;
