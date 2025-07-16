<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CallResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'caller_id' => $this->caller_id,
            'type' => $this->type,
            'status' => $this->status,
            'started_at' => optional($this->started_at)->toDateTimeString(),
            'ended_at' => optional($this->ended_at)->toDateTimeString(),

            'conversation' => [
                'id' => $this->conversation->id,
                'name' => $this->conversation->name,
                'is_group' => (bool) $this->conversation->is_group,
                'users' => UserResource::collection($this->conversation->users),
            ],
        ];
    }
}
