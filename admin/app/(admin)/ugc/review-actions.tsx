"use client";

import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ReviewActionsProps {
  questionId: string;
}

/** 审核动作在管理接口（P2-10）接入前不做假成功，仅提示待接入。 */
export function ReviewActions({ questionId }: ReviewActionsProps) {
  function notify() {
    void questionId;

    toast.info("审核接口尚未接入", {
      description: "P2-10 管理接口落地后开放通过 / 驳回操作",
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={notify}
        aria-label="通过"
      >
        <Check aria-hidden />
        通过
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={notify}
        aria-label="驳回"
      >
        <X aria-hidden />
        驳回
      </Button>
    </div>
  );
}
