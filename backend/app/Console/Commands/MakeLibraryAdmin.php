<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MakeLibraryAdmin extends Command
{
    protected $signature = 'library:make-admin {email}';

    protected $description = 'Grant administrator access to an existing library account';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();

        if (! $user) {
            $this->error('No account exists with that email address.');

            return self::FAILURE;
        }

        $user->update(['role' => 'admin']);
        $this->info("Administrator access granted to {$user->email}.");

        return self::SUCCESS;
    }
}
