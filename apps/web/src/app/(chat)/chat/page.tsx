"use client";

import { MessageCircle } from "lucide-react";

export default function ChatEmptyPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <MessageCircle className="size-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">No conversation selected</p>
        <p className="text-sm text-muted-foreground mt-1">
          Choose one from the sidebar or start a new one
        </p>
      </div>
    </div>
  );
}
