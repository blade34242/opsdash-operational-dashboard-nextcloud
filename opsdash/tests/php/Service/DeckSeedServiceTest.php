<?php
declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\DeckSeedService;
use OCP\IUser;
use OCP\IUserManager;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class DeckSeedServiceTest extends TestCase {
    private function serviceWithUser(string $userId = 'qa'): DeckSeedService {
        $user = $this->createMock(IUser::class);
        $userManager = $this->createMock(IUserManager::class);
        $userManager->method('get')->willReturnCallback(static function (string $uid) use ($user, $userId) {
            return $uid === $userId ? $user : null;
        });

        return new DeckSeedService($userManager);
    }

    private function callNormalize(DeckSeedService $service, string $color): string {
        $method = new ReflectionMethod($service, 'normalizeHex');
        $method->setAccessible(true);
        /** @var string $result */
        $result = $method->invoke($service, $color);
        return $result;
    }

    public function testNormalizeHexDefault(): void {
        $service = $this->serviceWithUser();
        $this->assertSame('2563EB', $this->callNormalize($service, ''));
    }

    public function testNormalizeHexStripsHashAndUppercases(): void {
        $service = $this->serviceWithUser();
        $this->assertSame('A1B2C3', $this->callNormalize($service, '#a1b2c3'));
    }

    public function testNormalizeHexTruncatesToSixChars(): void {
        $service = $this->serviceWithUser();
        $this->assertSame('123456', $this->callNormalize($service, '123456789'));
    }

    public function testSeedThrowsWhenUserMissing(): void {
        $userManager = $this->createMock(IUserManager::class);
        $userManager->method('get')->willReturn(null);
        $service = new DeckSeedService($userManager);

        $this->expectException(\OCA\Opsdash\Service\DeckSeedException::class);
        $service->seed(['userId' => 'ghost']);
    }
}
