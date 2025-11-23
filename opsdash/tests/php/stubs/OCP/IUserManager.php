<?php
declare(strict_types=1);

namespace OCP;

interface IUserManager {
	/**
	 * @return \OCP\IUser|null
	 */
	public function get(string $uid);
}
