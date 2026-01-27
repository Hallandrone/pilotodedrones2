import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, User, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FeedbackEntry {
	id: string;
	content: string;
	feedback_type: string;
	created_at: string;
	user_id: string;
	profiles: {
		full_name: string | null;
		email: string | null;
		avatar_url: string | null;
	} | null;
}

const AdminFeedback = () => {
	const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		fetchFeedback();
	}, []);

	const fetchFeedback = async () => {
		setLoading(true);
		try {
			const { data, error } = await (supabase
				.from("platform_feedback" as any)
				.select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
				.order("created_at", { ascending: false }) as any);

			if (error) throw error;
			setFeedback((data as any) || []);
		} catch (error) {
			console.error("Error fetching feedback:", error);
		} finally {
			setLoading(false);
		}
	};

	const getBadgeVariant = (type: string) => {
		switch (type) {
			case "bug":
				return "destructive";
			case "improvement":
				return "secondary";
			case "suggestion":
				return "outline";
			default:
				return "default";
		}
	};

	const getTypeText = (type: string) => {
		switch (type) {
			case "bug":
				return "Bug";
			case "improvement":
				return "Mejora";
			case "suggestion":
				return "Sugerencia";
			default:
				return type;
		}
	};

	return (
		<div className="space-y-6 animate-fade-in pb-12">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold text-white tracking-tight">Problemas o Sugerencias</h1>
					<p className="text-white/60 mt-1">Feedback enviado por los usuarios sobre la plataforma</p>
				</div>
				<Button
					onClick={fetchFeedback}
					variant="outline"
					className="bg-white/5 border-white/10 text-white hover:bg-white/10"
				>
					{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
					Actualizar
				</Button>
			</div>

			<Card className="bg-white/10 isolate border-white/10 shadow-2xl overflow-hidden">
				<CardHeader className="border-b border-white/10 bg-white/5">
					<CardTitle className="text-white flex items-center gap-2">
						<MessageSquare className="h-5 w-5 text-[#00b3f3]" />
						Listado de Feedback
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{loading ? (
						<div className="flex flex-col items-center justify-center py-20 text-white/40">
							<Loader2 className="h-12 w-12 animate-spin mb-4" />
							<p>Cargando feedback...</p>
						</div>
					) : feedback.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 text-white/40">
							<MessageSquare className="h-12 w-12 mb-4 opacity-20" />
							<p>No se han recibido comentarios aún</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader className="bg-white/5">
									<TableRow className="border-white/10 hover:bg-transparent">
										<TableHead className="text-white font-bold">Fecha / Hora</TableHead>
										<TableHead className="text-white font-bold">Usuario</TableHead>
										<TableHead className="text-white font-bold">Tipo</TableHead>
										<TableHead className="text-white font-bold">Contenido</TableHead>
										<TableHead className="text-white font-bold text-right">Acciones</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{feedback.map((entry) => (
										<TableRow key={entry.id} className="border-white/5 hover:bg-white/5 transition-colors">
											<TableCell className="text-white/80 whitespace-nowrap">
												{format(new Date(entry.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
											</TableCell>
											<TableCell>
												<div className="flex flex-col">
													<span className="text-white font-medium">{entry.profiles?.full_name || "Usuario Desconocido"}</span>
													<span className="text-white/40 text-xs">{entry.profiles?.email}</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant={getBadgeVariant(entry.feedback_type)} className="capitalize">
													{getTypeText(entry.feedback_type)}
												</Badge>
											</TableCell>
											<TableCell className="max-w-md">
												<p className="text-white/80 line-clamp-3 text-sm">{entry.content}</p>
											</TableCell>
											<TableCell className="text-right">
												<Button
													variant="ghost"
													size="sm"
													className="text-[#00b3f3] hover:text-white hover:bg-[#00b3f3]/20"
													onClick={() => navigate(`/pilot/${entry.user_id}`)}
												>
													<User className="h-4 w-4 mr-2" />
													Ver Perfil
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default AdminFeedback;
