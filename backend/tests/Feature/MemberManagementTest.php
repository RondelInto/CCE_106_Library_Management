<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MemberManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_member_profile_without_changing_access_or_penalties(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create([
            'name' => 'Riley Carter',
            'email' => 'riley@example.test',
            'library_id' => 'LIB-100',
            'member_type' => 'Student',
            'sex' => 'Female',
            'address' => 'Old address',
            'penalty_balance' => 12.50,
            'role' => 'member',
        ]);
        $originalPassword = $member->password;

        $this->actingAs($admin)
            ->putJson("/api/admin/members/{$member->id}", [
                'first_name' => 'Riley',
                'middle_name' => 'Morgan',
                'last_name' => 'Carter',
                'email' => 'riley.updated@example.test',
                'library_id' => 'LIB-101',
                'member_type' => 'Faculty / Staff',
                'address' => 'New address',
                'role' => 'admin',
                'password' => 'attacker-selected-password',
                'penalty_balance' => 0,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Riley Morgan Carter')
            ->assertJsonPath('data.email', 'riley.updated@example.test')
            ->assertJsonPath('data.library_id', 'LIB-101');

        $member->refresh();
        $this->assertSame('member', $member->role);
        $this->assertSame('12.50', $member->penalty_balance);
        $this->assertSame('New address', $member->address);
        $this->assertSame($originalPassword, $member->password);
        $this->assertTrue(Hash::check('password', $member->password));
    }

    public function test_admin_cannot_edit_another_admin_as_a_member(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $otherAdmin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->putJson("/api/admin/members/{$otherAdmin->id}", [
                'first_name' => 'Changed',
                'last_name' => 'Admin',
                'email' => $otherAdmin->email,
                'library_id' => 'ADMIN-ID',
                'member_type' => 'Student',
            ])
            ->assertNotFound();
    }
}
