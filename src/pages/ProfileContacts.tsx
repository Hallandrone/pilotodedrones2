import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, MessageCircle, Calendar, Search, ArrowLeft, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import Logo from "@/components/ui/logo";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";

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
	const { plan, loading: planLoading } = useSubscriptionPlan();

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

	if (loading || planLoading) {
		return (
			<div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0] flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF69B4] mb-4"></div>
					<p className="text-[#B0B0B0]">Cargando contactos...</p>
				</div>
			</div>
		);
	}

	// Mostrar pantalla de upgrade si el usuario tiene plan gratis
	if (plan && plan.isFree && userType !== 'admin' && userType !== 'super_admin') {
		return (
			<div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0]">
				{/* Header */}
				<div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg sticky top-0 z-50">
					<div className="px-3 sm:px-4 py-3 sm:py-4">
						<div className="flex items-center gap-2 sm:gap-4 max-w-7xl mx-auto">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => navigate('/pilot')}
								className="h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-gray-100 transition-all duration-300 text-gray-900 shrink-0"
							>
								<ArrowLeft className="h-5 w-5 sm:h-7 sm:w-7" />
							</Button>
							<Logo
								size="lg"
								className="flex-shrink-0 [&>div]:h-10 [&>div]:w-10 sm:[&>div]:h-14 sm:[&>div]:w-14 transition-all duration-300"
								showText={false}
							/>
							<div className="flex flex-col min-w-0">
								<h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight truncate">Contactos Recibidos</h1>
								<p className="text-[10px] sm:text-sm text-gray-600 font-medium uppercase tracking-wider truncate">
									Característica Pro
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Upgrade Content */}
				<div className="p-4 flex items-center justify-center min-h-[calc(100vh-80px)]">
					<Card className="bg-[#212121] border border-[#333333] shadow-2xl rounded-2xl overflow-hidden max-w-md w-full">
						<div className="bg-gradient-to-r from-[#FF69B4]/20 via-pink-500/10 to-[#FF69B4]/20 p-1">
							<CardContent className="p-8 bg-[#2C2C2C] rounded-xl text-center">
								<div className="h-20 w-20 bg-gradient-to-br from-[#FF69B4] to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
									<Crown className="h-10 w-10 text-white" />
								</div>
								<h3 className="text-2xl font-bold text-[#E0E0E0] mb-3">
									Actualiza a Plan Pro
								</h3>
								<p className="text-[#B0B0B0] mb-6">
									La bandeja de contactos recibidos está disponible en Plan Pro y Plan Empresa.
								</p>
								<div className="bg-[#212121] border border-[#333333] rounded-xl p-4 mb-6 text-left">
									<p className="text-sm font-semibold text-[#E0E0E0] mb-3">¿Qué es Contactos Recibidos?</p>
									<p className="text-sm text-[#B0B0B0] mb-3">
										Cuando clientes potenciales visitan tu perfil público, pueden enviarte un mensaje directo con sus datos de contacto (email, teléfono) y detalles sobre el servicio que necesitan.
									</p>
									<p className="text-sm font-semibold text-[#E0E0E0] mb-2">Con Plan Pro obtienes:</p>
									<ul className="space-y-2 text-sm text-[#B0B0B0]">
										<li className="flex items-start gap-2">
											<MessageCircle className="h-4 w-4 text-[#FF69B4] flex-shrink-0 mt-0.5" />
											<span>Recibe contactos directos de clientes interesados en tus servicios</span>
										</li>
										<li className="flex items-start gap-2">
											<Mail className="h-4 w-4 text-[#FF69B4] flex-shrink-0 mt-0.5" />
											<span>Acceso completo a emails y teléfonos de contacto</span>
										</li>
										<li className="flex items-start gap-2">
											<Calendar className="h-4 w-4 text-[#FF69B4] flex-shrink-0 mt-0.5" />
											<span>Organiza y gestiona todas tus solicitudes en un solo lugar</span>
										</li>
									</ul>
								</div>
								<Button
									onClick={() => navigate('/pilot/membership')}
									className="w-full bg-gradient-to-r from-[#FF69B4] to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
								>
									<Crown className="h-4 w-4 mr-2" />
									Ver Planes y Precios
								</Button>
							</CardContent>
						</div>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0]">
			{/* Header */}
			<div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg sticky top-0 z-50">
				<div className="px-3 sm:px-4 py-3 sm:py-4">
					<div className="flex items-center gap-2 sm:gap-4 max-w-7xl mx-auto">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								const destination = userType === 'company' ? '/company' : '/pilot';
								navigate(destination);
							}}
							className="h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-gray-100 transition-all duration-300 text-gray-900 shrink-0"
						>
							<ArrowLeft className="h-5 w-5 sm:h-7 sm:w-7" />
						</Button>
						<Logo
							size="lg"
							className="flex-shrink-0 [&>div]:h-10 [&>div]:w-10 sm:[&>div]:h-14 sm:[&>div]:w-14 transition-all duration-300"
							showText={false}
						/>
						<div className="flex flex-col min-w-0">
							<h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight truncate">Contactos</h1>
							<p className="text-[10px] sm:text-sm text-gray-600 font-medium uppercase tracking-wider truncate">
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
