import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, AtSign, FileText, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ContactForm = () => {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		subject: "",
		message: ""
	});

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const { error } = await supabase
				.from("contact_messages")
				.insert([
					{
						name: formData.name,
						email: formData.email,
						subject: formData.subject,
						message: formData.message,
						status: 'pending'
					}
				]);

			if (error) throw error;

			// Send email notification
			try {
				await supabase.functions.invoke("send-contact-email", {
					body: {
						record: {
							name: formData.name,
							email: formData.email,
							subject: formData.subject,
							message: formData.message
						}
					}
				});
			} catch (emailError) {
				console.error("Error sending notification email:", emailError);
				// We don't throw here to not interrupt the success flow for the user
			}

			toast.success("Mensaje enviado con éxito", {
				description: "Nos pondremos en contacto contigo a la brevedad."
			});

			setFormData({
				name: "",
				email: "",
				subject: "",
				message: ""
			});
		} catch (error) {
			console.error("Error sending message:", error);
			toast.error("Error al enviar mensaje", {
				description: "Por favor, intenta nuevamente o contáctanos por WhatsApp."
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="space-y-2">
				<label htmlFor="name" className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
					<User className="w-4 h-4" />
					Nombre Completo
				</label>
				<Input
					id="name"
					name="name"
					placeholder="Tu nombre"
					value={formData.name}
					onChange={handleChange}
					required
					className="h-12 bg-background/50"
				/>
			</div>

			<div className="grid md:grid-cols-2 gap-6">
				<div className="space-y-2">
					<label htmlFor="email" className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
						<AtSign className="w-4 h-4" />
						Correo Electrónico
					</label>
					<Input
						id="email"
						name="email"
						type="email"
						placeholder="tu@email.com"
						value={formData.email}
						onChange={handleChange}
						required
						className="h-12 bg-background/50"
					/>
				</div>
				<div className="space-y-2">
					<label htmlFor="subject" className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
						<FileText className="w-4 h-4" />
						Asunto
					</label>
					<Input
						id="subject"
						name="subject"
						placeholder="Motivo del mensaje"
						value={formData.subject}
						onChange={handleChange}
						className="h-12 bg-background/50"
					/>
				</div>
			</div>

			<div className="space-y-2">
				<label htmlFor="message" className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
					<MessageCircle className="w-4 h-4" />
					Mensaje
				</label>
				<Textarea
					id="message"
					name="message"
					placeholder="Escribe tu mensaje aquí..."
					value={formData.message}
					onChange={handleChange}
					required
					className="min-h-[150px] bg-background/50 resize-none"
				/>
			</div>

			<Button
				type="submit"
				className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/20 transition-all rounded-xl"
				disabled={loading}
			>
				{loading ? "Enviando..." : (
					<>
						Enviar Mensaje
						<Send className="w-4 h-4 ml-2" />
					</>
				)}
			</Button>
		</form>
	);
};
