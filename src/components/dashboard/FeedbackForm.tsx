import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { MessageSquarePlus, Send, Loader2 } from "lucide-react";

export function FeedbackForm() {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [content, setContent] = useState("");
	const [type, setType] = useState("suggestion");
	const { toast } = useToast();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!content.trim()) return;

		setLoading(true);
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error("No user found");

			const { error } = await (supabase.from("platform_feedback" as any).insert({
				user_id: user.id,
				content: content.trim(),
				feedback_type: type,
			}) as any);

			if (error) throw error;

			toast({
				title: "¡Gracias por tu feedback!",
				description: "Tu sugerencia o reporte ha sido enviado correctamente.",
			});
			setContent("");
			setOpen(false);
		} catch (error) {
			console.error("Error sending feedback:", error);
			toast({
				title: "Error",
				description: "No se pudo enviar el feedback. Inténtalo de nuevo.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size="lg"
					className="w-full justify-start bg-white/5 backdrop-blur-xl border-2 border-purple-500/30 hover:bg-purple-500 hover:border-purple-500 text-white hover:scale-105 transition-all duration-300 rounded-xl sm:rounded-2xl text-sm xl:text-base shadow-xl hover:shadow-2xl h-12 sm:h-14"
				>
					<MessageSquarePlus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
					Problemas o Sugerencias
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px] bg-[#083b4e] border-white/10 text-white">
				<DialogHeader>
					<DialogTitle className="text-2xl font-bold">Enviar Feedback</DialogTitle>
					<DialogDescription className="text-white/60">
						Cuéntanos sobre cualquier problema, bug o sugerencia de mejora para la plataforma.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 mt-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Tipo</label>
						<Select value={type} onValueChange={setType}>
							<SelectTrigger className="bg-white/5 border-white/10 text-white">
								<SelectValue placeholder="Selecciona el tipo" />
							</SelectTrigger>
							<SelectContent className="bg-[#083b4e] border-white/10 text-white">
								<SelectItem value="suggestion">Sugerencia</SelectItem>
								<SelectItem value="bug">Reportar Bug</SelectItem>
								<SelectItem value="improvement">Mejora</SelectItem>
								<SelectItem value="other">Otro</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Mensaje</label>
						<Textarea
							placeholder="Describe tu problema o sugerencia..."
							value={content}
							onChange={(e) => setContent(e.target.value)}
							className="min-h-[150px] bg-white/5 border-white/10 text-white placeholder:text-white/30"
							required
						/>
					</div>
					<Button
						type="submit"
						className="w-full bg-[#00b3f3] hover:bg-[#0099cc] text-white font-bold h-12 rounded-xl"
						disabled={loading || !content.trim()}
					>
						{loading ? (
							<Loader2 className="h-5 w-5 animate-spin mr-2" />
						) : (
							<Send className="h-5 w-5 mr-2" />
						)}
						Enviar Feedback
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
