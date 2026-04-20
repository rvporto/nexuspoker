import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (dataUrl: string) => void | Promise<void>;
}

export default function AiAvatarDialog({ open, onOpenChange, onPick }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setImageUrl(null);
    const { data, error } = await supabase.functions.invoke("generate-avatar", {
      body: { prompt: prompt.trim() },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (!data?.imageUrl) { toast.error("Resposta sem imagem"); return; }
    setImageUrl(data.imageUrl);
  }

  async function applyAvatar() {
    if (!imageUrl) return;
    await onPick(imageUrl);
    onOpenChange(false);
    setImageUrl(null);
    setPrompt("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 nexus-text-gold">
            <Sparkles className="h-5 w-5" /> Gerar avatar com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Ex: "estilo cyberpunk", "cartum 3d", "fotorrealista com chapéu de poker"'
            rows={3}
          />
          <p className="text-[11px] text-muted-foreground">
            Estilo base já inclui iluminação cinematográfica e tons de ouro/preto. Sua descrição refina o resultado.
          </p>

          <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/30">
            {loading ? (
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Gerando...
              </div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="Avatar gerado" className="h-full w-full object-cover" />
            ) : (
              <div className="text-xs text-muted-foreground">A imagem aparecerá aqui</div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" onClick={generate} disabled={loading} className="border-primary/40 text-primary hover:bg-primary/10">
            <RefreshCw className="h-3 w-3" /> {imageUrl ? "Gerar outro" : "Gerar"}
          </Button>
          <Button onClick={applyAvatar} disabled={!imageUrl || loading} className="bg-gradient-gold text-primary-foreground">
            Usar este
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
