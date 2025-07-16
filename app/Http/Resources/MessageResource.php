<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'conversation_id' => $this->conversation_id,
            'user_id'         => $this->user_id,
            'user_name'       => optional($this->user)->name,
            'body'            => $this->body,
            'type'            => $this->type ?? 'text',
            'sent_by_me'      => $this->user_id === auth()->id(),
            'created_at'      => $this->created_at?->toDateTimeString(),
            'read_at'         => $this->read_at?->toDateTimeString(),
        ];
    }
}
